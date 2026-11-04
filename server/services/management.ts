import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { BusinessError, type Actor, type Channel, type Entities, type Page, type TableName } from '../../shared/domain';
import { templateValueSchema, roomSchema, channelSchema, templateSchema } from '../../shared/validation';
import type { Repository } from '../db/repository';
import { timestamp } from '../../shared/time';
import { ChannelSender, barkConfig } from './channels';

export function paginate<T>(items: T[], page = 1, pageSize = 20): Page<T> {
  page = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1; pageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 20));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
}

export class ManagementService {
  constructor(private readonly repo: Repository, private readonly sender: ChannelSender) {}
  async owned<K extends 'rooms' | 'channels' | 'templates'>(name: K, actor: Actor, id: number): Promise<Entities[K]> {
    const item = await this.repo.one(name, { id } as Partial<Entities[K]>);
    if (!item || item.userId !== actor.id) throw new BusinessError('记录不存在', 404);
    return item;
  }
  async rooms(actor: Actor, page: number, search = '') {
    const rooms = (await this.repo.all('rooms', { userId: actor.id })).filter(r => r.name.includes(search) || r.code.includes(search));
    // 房间密钥只允许写入，页面仅获得是否设置的标记。
    return paginate(rooms.map(({ key, ...room }) => ({ ...room, hasKey: !!key })), page);
  }
  async saveRoom(actor: Actor, input: z.infer<typeof roomSchema>) {
    const previous = input.id ? await this.owned('rooms', actor, input.id) : undefined;
    const code = input.code || previous?.code || randomUUID();
    const duplicate = await this.repo.one('rooms', { code });
    if (duplicate && duplicate.id !== input.id) throw new BusinessError('房间代码已存在', 409);
    const value = { name: input.name, code, key: input.key || previous?.key || '', userId: actor.id, createdAt: previous?.createdAt || timestamp() };
    if (previous) { await this.repo.update('rooms', input.id, value); return input.id; }
    return this.repo.insert('rooms', value);
  }
  async channels(actor: Actor, page: number, search = '') {
    const items = (await this.repo.all('channels', { userId: actor.id })).filter(c => c.name.includes(search));
    return paginate(items.map(({ url, config, ...channel }) => ({ ...channel, hasUrl: !!url, hasProxy: !!channel.proxy, hasConfig: !!config })), page);
  }
  async saveChannel(actor: Actor, input: z.infer<typeof channelSchema>) {
    const previous = input.id ? await this.owned('channels', actor, input.id) : undefined;
    const url = input.url || previous?.url || '';
    if (input.type === 5) { if (!z.email().safeParse(url).success) throw new BusinessError('邮箱管道需要有效邮箱地址'); }
    else if (!URL.canParse(url) || !['http:', 'https:'].includes(new URL(url).protocol)) throw new BusinessError('请输入有效的 HTTP/HTTPS 管道地址');
    if (input.proxy && (!URL.canParse(input.proxy) || !['http:', 'https:'].includes(new URL(input.proxy).protocol))) throw new BusinessError('代理地址无效');
    if (input.config) { try { JSON.parse(input.config); } catch { throw new BusinessError('管道配置必须是 JSON'); } }
    const value = { name: input.name, type: input.type, url, proxy: input.proxy, config: input.config || previous?.config || '', userId: actor.id };
    if (value.type === 4) {
      try { barkConfig.parse(value.config ? JSON.parse(value.config) : {}); }
      catch { throw new BusinessError('Bark 加密配置无效，请检查模式、密钥与 IV 长度'); }
    }
    if (previous) { await this.repo.update('channels', input.id, value); return input.id; }
    return this.repo.insert('channels', value);
  }
  async clearChannelSecret(actor: Actor, id: number, field: 'proxy' | 'config') { await this.owned('channels', actor, id); await this.repo.update('channels', id, { [field]: '' }); }
  async clearRoomKey(actor: Actor, id: number) { await this.owned('rooms', actor, id); await this.repo.update('rooms', id, { key: '' }); }
  async templates(actor: Actor, page: number, search = '') { return paginate((await this.repo.all('templates', { userId: actor.id })).filter(t => t.name.includes(search) || t.code.includes(search)), page); }
  async saveTemplate(actor: Actor, input: z.infer<typeof templateSchema>) {
    const previous = input.id ? await this.owned('templates', actor, input.id) : undefined;
    let value;
    try { value = templateValueSchema.parse(JSON.parse(input.value)); } catch { throw new BusinessError('模板数据格式错误，需要 Variables 和 TemplateText'); }
    const code = input.code || previous?.code || randomUUID();
    const duplicate = await this.repo.one('templates', { code });
    if (duplicate && duplicate.id !== input.id) throw new BusinessError('模板代码已存在', 409);
    const row = { name: input.name, code, value, userId: actor.id };
    if (previous) { await this.repo.update('templates', input.id, row); return input.id; }
    return this.repo.insert('templates', row);
  }
  async linkChannels(actor: Actor, roomId: number, ids: number[]) {
    await this.owned('rooms', actor, roomId);
    for (const id of ids) await this.owned('channels', actor, id);
    for (const row of await this.repo.all('relations', { roomId })) await this.repo.remove('relations', row.id);
    for (const channelId of new Set(ids)) await this.repo.insert('relations', { roomId, channelId });
  }
  async linkRooms(actor: Actor, channelId: number, ids: number[]) {
    await this.owned('channels', actor, channelId);
    for (const id of ids) await this.owned('rooms', actor, id);
    for (const row of await this.repo.all('relations', { channelId })) await this.repo.remove('relations', row.id);
    for (const roomId of new Set(ids)) await this.repo.insert('relations', { roomId, channelId });
  }
  async roomDetail(actor: Actor, id: number, page: number) {
    const room = await this.owned('rooms', actor, id);
    const relations = await this.repo.all('relations', { roomId: id });
    const { key, ...safeRoom } = room;
    return { room: { ...safeRoom, hasKey: !!key }, channelIds: relations.map(r => r.channelId), channels: (await this.repo.all('channels', { userId: actor.id })).map(c => ({ id: c.id, name: c.name })), history: await this.repo.page('messages', { roomId: id }, page) };
  }
  async channelDetail(actor: Actor, id: number, page: number) {
    const channel = await this.owned('channels', actor, id);
    const { url, proxy, config, ...safeChannel } = channel;
    const relations = await this.repo.all('relations', { channelId: id });
    const roomIds = new Set(relations.map(r => r.roomId));
    const history = await this.repo.page('histories', { channelId: id }, page);
    const messages = new Map((await this.repo.all('messages', { id: history.items.map(h => h.messageId) })).map(m => [m.id, m]));
    return { channel: { ...safeChannel, hasUrl: !!url, hasProxy: !!proxy, hasConfig: !!config }, rooms: (await this.repo.all('rooms', { userId: actor.id })).filter(r => roomIds.has(r.id)).map(r => ({ id: r.id, name: r.name })), history: { ...history, items: history.items.map(h => ({ ...h, content: messages.get(h.messageId)?.content || '', recordedAt: messages.get(h.messageId)?.recordedAt || '' })) } };
  }
  async testChannel(actor: Actor, id: number) {
    const channel = await this.owned('channels', actor, id);
    const result = await this.sender.send(channel, '这是一条测试消息');
    if (!result.success) throw new BusinessError(result.result || '测试发送失败');
  }
  async remove(actor: Actor, name: 'rooms' | 'channels' | 'templates', id: number) {
    await this.owned(name, actor, id);
    if (name === 'rooms') {
      for (const message of await this.repo.all('messages', { roomId: id })) {
        for (const history of await this.repo.all('histories', { messageId: message.id })) await this.repo.remove('histories', history.id);
        await this.repo.remove('messages', message.id);
      }
    }
    if (name === 'channels') for (const h of await this.repo.all('histories', { channelId: id })) await this.repo.remove('histories', h.id);
    if (name !== 'templates') for (const r of await this.repo.all('relations', name === 'rooms' ? { roomId: id } : { channelId: id })) await this.repo.remove('relations', r.id);
    await this.repo.remove(name, id);
  }
  async deleteUserData(id: number) {
    const user = await this.repo.one('users', { id });
    if (!user) return;
    const actor = { id, username: user.username, role: user.role };
    for (const table of ['rooms', 'channels', 'templates'] as const) for (const row of await this.repo.all(table, { userId: id })) await this.remove(actor, table, row.id);
  }
  async initDemo(id: number) {
    const roomId = await this.repo.insert('rooms', { name: '示例-房间名', code: randomUUID(), key: '', userId: id, createdAt: timestamp() });
    const channelId = await this.repo.insert('channels', { name: '示例-飞书', type: 2, url: 'https://open.feishu.cn/open-apis/bot/v2/hook/REPLACE_ME', proxy: '', config: '', userId: id });
    await this.repo.insert('relations', { roomId, channelId });
    await this.repo.insert('templates', { name: '示例模板-测试', code: randomUUID(), userId: id, value: { Variables: [{ VariableName: 'a', JsonPath: '$.b' }], TemplateText: 'haha\n{{ a }}\nheihei' } });
  }
}
