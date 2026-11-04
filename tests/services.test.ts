import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import Sqlite from 'better-sqlite3';
import { createConnection } from 'mysql2/promise';
import { migrateDatabase } from '../server/db/migrations';
import { openDatabase } from '../server/db/connection';
import { createServices } from '../server/services';
import { ChannelSender, type OutboundRequest } from '../server/services/channels';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { createStatisticsReader } from '../server/db/statistics';
import * as mysqlTables from '../server/db/mysql';
import type { Actor } from '../shared/domain';
import { SignJWT } from 'jose';
import { timestamp } from '../shared/time';

const mysqlUrl = process.env.TEST_MYSQL_URL;
if (mysqlUrl && !new URL(mysqlUrl).pathname.startsWith('/pusher_ai_test_')) throw new Error('MySQL 测试仅允许 pusher_ai_test_ 前缀的独立数据库');
for (const dialect of ['sqlite', 'mysql'] as const) {
  describe.skipIf(dialect === 'mysql' && !mysqlUrl)(`${dialect} 迁移与业务集成`, () => {
    let service: ReturnType<typeof createServices>;
    let file: string;
    let config: Parameters<typeof openDatabase>[0];
    const admin: Actor = { id: 1, username: 'fake_email', role: 100 };
    const stranger: Actor = { id: 999, username: 'fake_user', role: 0 };
    const mail = vi.fn(async () => {});
    const transport = vi.fn(async (_request: OutboundRequest) => ({ ok: true, text: '{}' }));
    beforeEach(async () => {
      mkdirSync('debug', { recursive: true });
      file = resolve(`debug/tmpfile-AI-test-${randomUUID()}.sqlite`);
      config = dialect === 'sqlite' ? { dialect, path: file } : { dialect, url: mysqlUrl! };
      process.env.ADMIN_USERNAME = 'fake_email'; process.env.ADMIN_PASSWORD = 'fake_password';
      process.env.JWT_KEY = Buffer.alloc(32, 7).toString('base64'); process.env.JWT_ISSUER = 'fake_info'; process.env.JWT_AUDIENCE = 'fake_info';
      await migrateDatabase('reset', config);
      service = createServices(openDatabase(config), new ChannelSender(transport, mail), mail);
      await service.system.initialize();
      mail.mockClear(); transport.mockClear();
    });
    afterEach(async () => { await service?.repo.close(); if (dialect === 'sqlite') for (const suffix of ['', '-wal', '-shm']) rmSync(file + suffix, { force: true }); });
    it('初始化、重复迁移与基线保留用户和结构', async () => {
      await service.system.initialize(); await migrateDatabase('migrate', config);
      expect(await service.repo.all('users')).toHaveLength(1); expect(await service.repo.all('templates')).toHaveLength(4);
      if (dialect === 'sqlite') {
        const raw = new Sqlite(file); raw.exec('DROP TABLE __drizzle_migrations'); raw.close();
      } else {
        const raw = await createConnection(mysqlUrl!); try { await raw.query('DROP TABLE __drizzle_migrations'); } finally { await raw.end(); }
      }
      await expect(migrateDatabase('migrate', config)).rejects.toThrow('db:baseline');
      await migrateDatabase('baseline', config); await migrateDatabase('migrate', config);
      expect((await service.repo.one('users', { id: 1 }))?.password).toBe('fake_password');
    });
    it('登录、改密、找回邮件限频与 JWT', async () => {
      const token = await service.auth.login(admin.username, 'fake_password');
      expect(await service.auth.authenticate(token)).toEqual(admin);
      await expect(service.auth.login(admin.username, 'wrong')).rejects.toThrow();
      await service.auth.changePassword(admin, 'fake_password', 'fake_secret');
      await service.users.passwordMail('fake_email@example.invalid');
      await expect(service.users.passwordMail('fake_email@example.invalid')).rejects.toThrow('10分钟');
      expect(mail).toHaveBeenCalledTimes(1);
      await expect(service.auth.login(admin.username, 'fake_password')).rejects.toThrow('用户名或密码错误');
      expect(await service.auth.authenticate(await service.auth.login(admin.username, 'fake_secret'))).toEqual(admin);
      expect(await service.auth.authenticate(token)).toEqual(admin);
      expect(await service.auth.authenticate(token + 'fake_info')).toBeNull();
    });
    it('旧 JWT 立即读取当前角色，改名或删除后的账号不能继续使用原身份', async () => {
      const id = await service.repo.insert('users', { username: 'fake_user', password: 'fake_password', role: 100, lastForgetTime: null, lastLoginTime: null });
      const token = await service.auth.login('fake_user', 'fake_password');
      await service.users.role(admin, id, 0);
      const current = (await service.auth.authenticate(token))!;
      expect(current).toEqual({ id, username: 'fake_user', role: 0 });
      await expect(service.system.stats(current, 7, true)).rejects.toMatchObject({ status: 403 });
      await expect(service.users.role(admin, admin.id, 0)).rejects.toThrow('不能取消自己的管理员权限');
      await expect(service.users.remove(admin, admin.id)).rejects.toThrow('不能删除当前登录账号');
      await service.users.remove(admin, id);
      expect(await service.auth.authenticate(token)).toBeNull();
      await service.users.remove(admin, id);
      expect(await service.repo.one('users', { id })).toBeUndefined();
      expect(await service.auth.authenticate(token)).toBeNull();
    });
    it('拒绝签名有效但签发者、受众、有效期或账号 ID 不匹配的 JWT', async () => {
      for (const [issuer, audience, expiry, id] of [
        ['fake_username', 'fake_info', '1h', String(admin.id)],
        ['fake_info', 'fake_username', '1h', String(admin.id)],
        ['fake_info', 'fake_info', -1, String(admin.id)],
        ['fake_info', 'fake_info', '1h', '999'],
      ] as const) {
        const token = await new SignJWT({ name: admin.username, jti: id })
          .setProtectedHeader({ alg: 'HS256' }).setIssuer(issuer).setAudience(audience).setExpirationTime(expiry)
          .sign(Buffer.alloc(32, 7));
        expect(await service.auth.authenticate(token)).toBeNull();
      }
    });
    it('密码邮件失败仍创建账号并保留限频，十分钟后发送原密码', async () => {
      const username = 'fake_email@example.invalid';
      mail.mockRejectedValueOnce(new Error('fake_info'));
      await expect(service.users.passwordMail(username)).rejects.toThrow('fake_info');
      const user = (await service.repo.one('users', { username }))!;
      expect(user).toMatchObject({ role: 0, lastLoginTime: null });
      expect(user.lastForgetTime).not.toBeNull();
      expect(await service.repo.all('rooms', { userId: user.id })).toEqual([]);
      expect(await service.repo.all('templates', { userId: user.id })).toEqual([]);
      await expect(service.users.passwordMail(username)).rejects.toMatchObject({ status: 429 });
      expect(mail).toHaveBeenCalledTimes(1);
      await service.repo.update('users', user.id, { lastForgetTime: timestamp(new Date(Date.now() - 600001)) });
      await service.users.passwordMail(username);
      expect(mail).toHaveBeenCalledTimes(2);
      expect(mail).toHaveBeenLastCalledWith(username, 'pusher-用户注册', `欢迎注册pusher,你的用户名是${username},你的密码是${user.password}`);
      expect((await service.repo.one('users', { id: user.id }))?.password).toBe(user.password);
    });
    it('编辑凭据留空保持原值，仅显式清除生效，并拒绝跨账号关联', async () => {
      const otherId = await service.repo.insert('users', { username: 'fake_user', password: 'fake_password', role: 0, lastForgetTime: null, lastLoginTime: null });
      const other: Actor = { id: otherId, username: 'fake_user', role: 0 };
      const room = await service.management.saveRoom(admin, { id: 0, name: '房间', code: 'credential-room', key: 'fake_secret' });
      const original = { id: 0, name: '管道', type: 6, url: 'https://example.invalid/fake_key', proxy: 'http://fake_user:fake_password@localhost:8080', config: '{"token":"fake_secret"}' };
      const channel = await service.management.saveChannel(admin, original);
      const foreign = await service.management.saveChannel(other, { ...original, proxy: '', config: '' });
      await service.management.linkChannels(admin, room, [channel, channel]);
      await expect(service.management.linkChannels(admin, room, [channel, foreign])).rejects.toThrow('记录不存在');
      expect(await service.repo.all('relations', { roomId: room })).toMatchObject([{ channelId: channel }]);
      await service.management.saveRoom(admin, { id: room, name: '新名称', code: '', key: '' });
      await service.management.saveChannel(admin, { ...original, id: channel, name: '新名称', url: '', proxy: '', config: '' });
      expect(await service.repo.one('rooms', { id: room })).toMatchObject({ code: 'credential-room', key: 'fake_secret' });
      expect(await service.repo.one('channels', { id: channel })).toMatchObject({ url: original.url, proxy: original.proxy, config: original.config });
      await expect(service.management.clearRoomKey(other, room)).rejects.toThrow('记录不存在');
      await service.management.clearRoomKey(admin, room);
      await service.management.clearChannelSecret(admin, channel, 'proxy');
      await service.management.clearChannelSecret(admin, channel, 'config');
      expect(await service.repo.one('rooms', { id: room })).toMatchObject({ key: '' });
      expect(await service.repo.one('channels', { id: channel })).toMatchObject({ url: original.url, proxy: '', config: '' });
    });
    it('增量 SQL 只执行一次，保留已有数据并拒绝修改已应用的 SQL', async () => {
      const directory = resolve(`debug/tmpfile-AI-migrations-${randomUUID()}`);
      cpSync(resolve('db/migrations', dialect), directory, { recursive: true });
      const journalPath = resolve(directory, 'meta/_journal.json');
      const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: { idx: number; version: string; when: number; tag: string; breakpoints: boolean }[] };
      journal.entries.push({ ...journal.entries[0]!, idx: 1, when: journal.entries[0]!.when + 1, tag: '0001_test_addition' });
      writeFileSync(journalPath, JSON.stringify(journal));
      const migration = resolve(directory, '0001_test_addition.sql');
      writeFileSync(migration, 'ALTER TABLE `Room` ADD COLUMN `ExtraTestValue` text;');
      await migrateDatabase('migrate', config, directory); await migrateDatabase('migrate', config, directory);
      expect((await service.repo.one('users', { id: 1 }))?.username).toBe('fake_email');
      writeFileSync(migration, 'ALTER TABLE `Room` ADD COLUMN `OtherTestValue` text;');
      await expect(migrateDatabase('migrate', config, directory)).rejects.toThrow('迁移历史');
    });
    it('页面与推送共享业务，权限与密钥校验，凭据不进入页面数据', async () => {
      const roomId = await service.management.saveRoom(admin, { id: 0, name: '房间', code: 'room', key: 'fake_secret' });
      const channelId = await service.management.saveChannel(admin, { id: 0, name: '管道', type: 6, url: 'https://example.invalid/fake_key', proxy: '', config: '' });
      await service.management.linkChannels(admin, roomId, [channelId]);
      await expect(service.management.linkChannels(stranger, roomId, [])).rejects.toThrow('记录不存在');
      await expect(service.users.list(stranger, 1)).rejects.toThrow('管理员');
      const input = { content: '中文\n消息', messageType: 0, templateCode: '', extra: {} };
      expect(await service.push.external('room', 'wrong', input)).toBe(false);
      expect(await service.push.external('room', 'fake_secret', input)).toBe(true);
      expect(await service.push.owned(admin, roomId, input)).toBe(true);
      expect(await service.repo.all('messages')).toHaveLength(2);
      expect((await service.repo.all('histories')).every(h => h.success && h.status === 1)).toBe(true);
      expect(transport).toHaveBeenCalledTimes(2);
      const safe = JSON.stringify({ rooms: await service.management.rooms(admin, 1), channels: await service.management.channels(admin, 1), users: await service.users.list(admin, 1) });
      expect(safe).not.toContain('fake_secret'); expect(safe).not.toContain('fake_key'); expect(safe).not.toContain('fake_password');
      await service.management.remove(admin, 'rooms', roomId);
      expect(await service.repo.all('histories')).toHaveLength(0);
    });
    it('接收成功与管道发送失败分开记录', async () => {
      const bad = createServices(service.repo, new ChannelSender(async () => ({ ok: false, text: 'fake_secret' })), mail);
      const roomId = await bad.management.saveRoom(admin, { id: 0, name: '失败房间', code: 'fail', key: '' });
      const channelId = await bad.management.saveChannel(admin, { id: 0, name: '失败管道', type: 6, url: 'https://example.invalid/send', proxy: '', config: '' });
      await bad.management.linkChannels(admin, roomId, [channelId]);
      expect(await bad.push.external('fail', '', { content: '内容', messageType: 0, templateCode: '', extra: {} })).toBe(true);
      expect((await bad.repo.all('histories'))[0]).toMatchObject({ status: 1, success: false });
    });
    it('单个管道失败不阻断其他管道，历史对应同一条渲染后消息', async () => {
      const room = await service.management.saveRoom(admin, { id: 0, name: '房间', code: 'partial-failure', key: '' });
      const first = await service.management.saveChannel(admin, { id: 0, name: '成功管道', type: 6, url: 'https://example.invalid/success', proxy: '', config: '' });
      const second = await service.management.saveChannel(admin, { id: 0, name: '失败管道', type: 6, url: 'https://example.invalid/failure', proxy: '', config: '' });
      await service.management.linkChannels(admin, room, [first, second]);
      transport.mockImplementation(async request => ({ ok: !request.url.endsWith('/failure'), text: '{}' }));
      try {
        expect(await service.push.external('partial-failure', '', { content: 'fake_info', messageType: 0, templateCode: '', extra: {} })).toBe(true);
        const messages = await service.repo.all('messages', { roomId: room });
        expect(messages).toHaveLength(1);
        expect(messages[0]?.content).toBe('fake_info');
        expect(await service.repo.all('histories', { messageId: messages[0]!.id })).toEqual(expect.arrayContaining([
          expect.objectContaining({ channelId: first, status: 1, success: true }), expect.objectContaining({ channelId: second, status: 1, success: false }),
        ]));
        expect(transport).toHaveBeenCalledTimes(2);
        const historyCount = (await service.repo.all('histories')).length;
        await service.management.testChannel(admin, first);
        expect(await service.repo.all('messages', { roomId: room })).toHaveLength(1);
        expect(await service.repo.all('histories')).toHaveLength(historyCount);
      } finally { transport.mockImplementation(async () => ({ ok: true, text: '{}' })); }
    });
    it('重置只替换四个系统模板，保留与原型属性同名的自定义模板', async () => {
      const codes = ['constructor', 'toString', '__proto__'];
      for (const code of codes) await service.management.saveTemplate(admin, { id: 0, name: code, code, value: JSON.stringify({ Variables: [], TemplateText: code }) });
      await service.system.resetTemplates(admin);
      expect(await service.repo.all('templates')).toHaveLength(7);
      for (const code of codes) expect((await service.repo.one('templates', { code }))?.value.TemplateText).toBe(code);
    });
    it('房间和管道历史按数据库分页，只读取当前页对应的正文', async () => {
      const roomId = await service.management.saveRoom(admin, { id: 0, name: '分页房间', code: 'page', key: '' });
      const channelId = await service.management.saveChannel(admin, { id: 0, name: '分页管道', type: 6, url: 'https://example.invalid/send', proxy: '', config: '' });
      await service.management.linkChannels(admin, roomId, [channelId]);
      for (let i = 1; i <= 25; i++) {
        const messageId = await service.repo.insert('messages', { type: 0, content: `消息 ${i}`, comment: '', recordedAt: '2026-10-21 00:00:00.000', roomId });
        await service.repo.insert('histories', { messageId, channelId, status: 1, success: true, result: null });
      }
      const room = await service.management.roomDetail(admin, roomId, 2);
      expect(room.history).toMatchObject({ total: 25, page: 2, pageSize: 20 });
      expect(room.history.items.map(m => m.content)).toEqual(['消息 5', '消息 4', '消息 3', '消息 2', '消息 1']);
      const reads = vi.spyOn(service.repo, 'all');
      try {
        const detail = await service.management.channelDetail(admin, channelId, 2);
        expect(detail.history).toMatchObject({ total: 25, page: 2, pageSize: 20 });
        expect(detail.history.items.map(h => h.content)).toEqual(room.history.items.map(m => m.content));
        const messageReads = reads.mock.calls.filter(([name]) => name === 'messages');
        expect(messageReads).toHaveLength(1);
        expect(messageReads[0]![1]).toEqual({ id: room.history.items.map(m => m.id) });
        expect((await service.management.channelDetail(admin, channelId, 3)).history.items).toEqual([]);
      } finally { reads.mockRestore(); }
      expect(await service.repo.all('messages', { id: [] })).toEqual([]);
      expect((await service.repo.one('messages', { roomId }))?.content).toBe('消息 25');
      expect((await service.management.roomDetail(admin, roomId, 1e300)).history.items).toEqual([]);
    });
    it('统计接受原型属性同名资源，且不混入其他用户的消息', async () => {
      const roomId = await service.management.saveRoom(admin, { id: 0, name: '__proto__', code: 'stats', key: '' });
      const channelId = await service.management.saveChannel(admin, { id: 0, name: 'constructor', type: 6, url: 'https://example.invalid/send', proxy: '', config: '' });
      await service.management.linkChannels(admin, roomId, [channelId]);
      await service.push.owned(admin, roomId, { content: '正文', templateCode: '', messageType: 0, extra: {} });
      const stats = await service.system.stats(admin);
      expect(stats).toMatchObject({ messageCount: 1, failureCount: 0, byRoom: [{ name: '__proto__', count: 1 }], byChannel: [{ name: 'constructor', count: 1 }] });
      expect((await service.system.stats(stranger)).messageCount).toBe(0);
      expect(await service.system.stats(admin, 7, true)).toMatchObject({ byUser: [{ name: admin.username, count: 1 }], byChannelType: [{ name: '6', count: 1 }] });
    });
    it('数据库聚合按归属与时间过滤，名称区分大小写，不读取实体全集', async () => {
      const userId = await service.repo.insert('users', { username: 'fake_user', password: 'fake_password', role: 0, lastLoginTime: null, lastForgetTime: null });
      const other: Actor = { id: userId, username: 'fake_user', role: 0 };
      const first = await service.management.saveRoom(admin, { id: 0, name: 'Case', code: 'stats-first', key: '' });
      const second = await service.management.saveRoom(admin, { id: 0, name: 'case', code: 'stats-second', key: '' });
      const foreign = await service.management.saveRoom(other, { id: 0, name: 'Case', code: 'stats-foreign', key: '' });
      const channel = await service.management.saveChannel(admin, { id: 0, name: 'fake_info', type: 6, url: 'https://example.invalid/send', proxy: '', config: '' });
      await service.management.saveChannel(other, { id: 0, name: 'fake_info', type: 4, url: 'https://example.invalid/send', proxy: '', config: '' });
      const add = (roomId: number, recordedAt: string) => service.repo.insert('messages', { roomId, recordedAt, type: 0, content: '不应被统计读取的正文', comment: '' });
      const recent = await add(first, '2026-10-21 10:00:00.000');
      const boundary = await add(second, '2026-10-20 12:00:00.000');
      const otherMessage = await add(foreign, '2026-10-21 11:00:00.000');
      const old = await add(first, '2026-10-13 10:00:00.000');
      for (const [messageId, channelId, success] of [[recent, channel, false], [boundary, 999, true], [otherMessage, 999, false], [old, channel, false]] as const) {
        await service.repo.insert('histories', { messageId, channelId, status: 1, success, result: null });
      }
      const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-21T12:00:00+08:00'));
      const reads = vi.spyOn(service.repo, 'all').mockRejectedValue(new Error('统计不能读取实体全集'));
      try {
        expect(await service.system.stats(admin, 1)).toMatchObject({ roomCount: 2, channelCount: 1, messageCount: 2, failureCount: 1,
          byDay: [{ name: '2026-10-20', count: 1 }, { name: '2026-10-21', count: 1 }],
          byRoom: expect.arrayContaining([{ name: 'Case', count: 1 }, { name: 'case', count: 1 }]),
          byChannel: expect.arrayContaining([{ name: '已删除管道', count: 1 }, { name: 'fake_info', count: 1 }]),
        });
        expect(await service.system.stats(admin, 7, true)).toMatchObject({ roomCount: 3, channelCount: 2, messageCount: 3, failureCount: 2,
          byUser: expect.arrayContaining([{ name: admin.username, count: 2 }, { name: other.username, count: 1 }]),
          byRoom: expect.arrayContaining([{ name: 'Case', count: 2 }, { name: 'case', count: 1 }]),
        });
        expect((await service.system.stats(admin, 60)).messageCount).toBe(3);
        expect((await service.system.stats(stranger)).messageCount).toBe(0);
        expect(reads).not.toHaveBeenCalled();
        if (dialect === 'mysql') {
          const connection = await createConnection(mysqlUrl!);
          try {
            await connection.query("SET SESSION sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'");
            const compiler = new MySqlDialect();
            const strictRead = createStatisticsReader(mysqlTables, async query => {
              const compiled = compiler.sqlToQuery(query);
              return (await connection.query<import('mysql2/promise').RowDataPacket[]>(compiled.sql, compiled.params))[0];
            }, 'mysql');
            expect(await strictRead('2026-10-20 12:00:00.000', admin.id)).toEqual(await service.system.stats(admin, 1));
            expect(await strictRead('2026-10-14 12:00:00.000')).toEqual(await service.system.stats(admin, 7, true));
          } finally { await connection.end(); }
        }
      } finally { reads.mockRestore(); clock.mockRestore(); }
    });
    it('Bark 保存时校验加密配置，留空编辑保留有效配置', async () => {
      const input = { id: 0, name: 'Bark', type: 4, url: 'https://example.invalid/send', proxy: '', config: '{"encryptionMode":"AES128CBC"}' };
      await expect(service.management.saveChannel(admin, input)).rejects.toThrow('Bark 加密配置无效');
      const config = JSON.stringify({ encryptionMode: 'AES128CBC', encryptionKey: 'x'.repeat(16), encryptionIv: 'y'.repeat(16) });
      const id = await service.management.saveChannel(admin, { ...input, config });
      await service.management.saveChannel(admin, { ...input, id, config: '' });
      expect((await service.repo.one('channels', { id }))?.config).toBe(config);
    });
    it('用户两次删除及定时清理边界', async () => {
      await service.users.create(admin, { username: 'fake_user', password: 'fake_password', role: 0 });
      const user = (await service.repo.one('users', { username: 'fake_user' }))!;
      await service.users.remove(admin, user.id); expect((await service.repo.one('users', { id: user.id }))?.username).toBe('delete_fake_user');
      await service.users.remove(admin, user.id); expect(await service.repo.one('users', { id: user.id })).toBeUndefined();
      await service.system.clean(); expect(await service.repo.one('users', { id: admin.id })).toBeDefined();
    });
    it('按完整天数清理过期消息并删除对应发送历史', async () => {
      process.env.MESSAGE_RETENTION_DAYS = '30';
      const roomId = await service.management.saveRoom(admin, { id: 0, name: '清理房间', code: 'retention', key: '' });
      const date = (days: number) => timestamp(new Date(Date.now() - days * 86400000));
      const old = await service.repo.insert('messages', { type: 0, content: '过期', comment: '', roomId, recordedAt: date(31.5) });
      const kept = await service.repo.insert('messages', { type: 0, content: '保留', comment: '', roomId, recordedAt: date(30.5) });
      await service.repo.insert('histories', { channelId: 999, messageId: old, status: 1, success: true, result: null });
      await service.system.clean();
      expect(await service.repo.one('messages', { id: old })).toBeUndefined();
      expect(await service.repo.one('messages', { id: kept })).toBeDefined();
      expect(await service.repo.all('histories', { messageId: old })).toHaveLength(0);
    });
  });
}
