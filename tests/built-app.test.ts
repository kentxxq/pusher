import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { migrateDatabase } from '../server/db/migrations';
import { openDatabase } from '../server/db/connection';
import { createServices } from '../server/services';
import { publicRequest } from '../server/request-origin';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { disabledProxy } from '../shared/proxy';

describe.skipIf(!existsSync('dist/ssr/app.js'))('构建产物请求验证（不监听端口）', () => {
  let app: Hono;
  let cookie = '';
  let csrf = '';
  beforeAll(async () => {
    mkdirSync('debug', { recursive: true });
    process.env.DB_DIALECT = 'sqlite'; process.env.SQLITE_PATH = resolve(`debug/tmpfile-AI-smoke-${randomUUID()}.sqlite`);
    process.env.JWT_KEY = Buffer.alloc(32, 7).toString('base64'); process.env.JWT_ISSUER = 'fake_info'; process.env.JWT_AUDIENCE = 'fake_info';
    process.env.ADMIN_USERNAME = 'fake_email'; process.env.ADMIN_PASSWORD = 'fake_password'; process.env.APP_URL = 'http://localhost';
    await migrateDatabase();
    const service = createServices(openDatabase());
    await service.system.initialize();
    await service.repo.close();
    app = (await import(/* @vite-ignore */ pathToFileURL(resolve('dist/ssr/app.js')).href)).default;
  });
  it('首屏 SSR 与登录跳转正常，Cookie 设置安全属性', async () => {
    expect((await app.request('/')).status).toBe(302);
    const response = await app.request('/login');
    const html = await response.text();
    expect(response.status, html.slice(0, 500)).toBe(200);
    expect(html).toContain('注册 / 忘记密码');
    expect(html).not.toContain('href="/rooms"');
    expect(html).not.toContain('系统管理');
    expect(html).toContain('autocomplete="current-password"');
    expect(html).not.toContain('发送密码邮件');
    expect(html).not.toContain('type="email"');
    const header = response.headers.get('set-cookie') || '';
    expect(header.toLowerCase()).toContain('httponly');
    csrf = header.match(/pusher_csrf=([^;]+)/)?.[1] || '';
    expect(csrf).not.toBe(''); cookie = `pusher_csrf=${csrf}`;
  });
  it('拒绝跨域、缺失 CSRF 的登录 Action', async () => {
    const request = (origin: string, token?: string) => app.request('/login?login', { method: 'POST', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify({ username: 'fake_email', password: 'fake_password', csrf: token }) });
    expect((await request('https://example.invalid', csrf)).status).toBe(403);
    expect((await request('http://localhost')).status).toBe(403);
  });
  it('登录 Action、页面 Loader 和旧推送路由', async () => {
    const response = await app.request('/login?login', { method: 'POST', headers: { origin: 'http://localhost', cookie, 'content-type': 'application/json' }, body: JSON.stringify({ username: 'fake_email', password: 'fake_password', csrf }) });
    expect([302, 303]).toContain(response.status);
    const session = response.headers.get('set-cookie')?.match(/pusher_session=([^;]+)/)?.[1];
    expect(session).toBeTruthy();
    cookie += `; pusher_session=${session}`;
    for (const path of ['/', '/rooms', '/channels', '/templates', '/account', '/admin/dashboard', '/admin/user', '/admin/db']) {
      const page = await app.request(path, { headers: { cookie } });
      expect(page.status, `${path}: ${(await page.text()).slice(0, 300)}`).toBe(200);
    }
    const authenticatedLogin = await app.request('/login', { headers: { cookie } });
    const authenticatedLoginHtml = await authenticatedLogin.text();
    expect(authenticatedLoginHtml).toContain('注册 / 忘记密码');
    expect(authenticatedLoginHtml).not.toContain('href="/rooms"');
    expect(authenticatedLoginHtml).not.toContain('系统管理');
    const adminHtml = await (await app.request('/admin/user', { headers: { cookie } })).text();
    expect(adminHtml).toContain('fake_email的账号菜单');
    expect(adminHtml).not.toContain('退出登录');
    expect(adminHtml).toContain('仪表盘');
    expect(adminHtml).toContain('用户管理');
    expect(adminHtml).toContain('数据库管理');
    expect(adminHtml).toContain('href="/admin/dashboard"');
    expect(adminHtml).toContain('href="/admin/user"');
    expect(adminHtml).toContain('href="/admin/db"');
    const push = await app.request('/pusher.webapi/Room/SendMessageByGet/missing?content=x');
    expect(await push.json()).toEqual({ code: 20000, message: 'Success', data: '房间missing接收请求：False' });
    const invalid = await app.request('/pusher.webapi/Room/SendMessageByGet/missing');
    expect(invalid.status).toBe(200); expect(await invalid.json()).toMatchObject({ code: 50000, message: '参数验证错误' });
    expect((await app.request('/pusher.webapi/User/Login', { method: 'POST' })).status).toBe(404);
  });
  it('管理页独立加载，统计周期由服务端验证', async () => {
    const entry = await app.request('/admin', { headers: { cookie } });
    expect(entry.status).toBe(302);
    expect(entry.headers.get('location')).toContain('/admin/dashboard');
    const load = async (path: string) => (await app.request(path, { headers: { cookie, 'X-VoidPages': 'true' } })).json();
    const dashboard = await load('/admin/dashboard');
    expect(dashboard.props.days).toBe(7);
    expect(dashboard.props).not.toHaveProperty('users');
    expect((await load('/admin/user')).props).not.toHaveProperty('stats');
    expect(Object.keys((await load('/admin/db')).props)).toEqual(['csrf']);
    for (const path of ['/', '/admin/dashboard']) {
      for (const days of [1, 60]) expect((await load(`${path}?days=${days}`)).props.days).toBe(days);
      for (const days of ['0', '61', '1.5', 'invalid']) expect((await app.request(`${path}?days=${days}`, { headers: { cookie } })).status).toBe(400);
      expect(await (await app.request(path, { headers: { cookie } })).text()).toContain('图表加载中');
    }
  });
  it('模板草稿预览复用发送规则，保留列表参数且不产生写入', async () => {
    const repo = openDatabase();
    try {
      const snapshot = async () => Promise.all((['users', 'rooms', 'channels', 'templates', 'messages', 'histories', 'relations'] as const).map(table => repo.all(table)));
      const before = await snapshot();
      const value = JSON.stringify({ Variables: [{ VariableName: 'content', JsonPath: '$.content' }, { VariableName: 'missing', JsonPath: '$.missing' }, { VariableName: 'invalid', JsonPath: '$[' }], TemplateText: '{{content}}' });
      const post = (body: object, token = csrf) => app.request('/templates?preview', { method: 'POST', headers: { origin: 'http://localhost', cookie, 'content-type': 'application/json', 'X-VoidPages': 'true' }, body: JSON.stringify({ value, sample: '{"content":"<b>中文</b>"}', page: 1, search: 'fake_info', ...body, csrf: token }) });
      const result = await post({});
      expect(result.status).toBe(200);
      const page = await result.json();
      expect(page.props.search).toBe('fake_info');
      expect(page.props.preview.rendered).toBe('&lt;b&gt;中文&lt;/b&gt;');
      expect(page.props.preview.variables.map((variable: { status: string }) => variable.status)).toEqual(['matched', 'missing', 'invalid']);
      expect((await (await post({ sample: '普通文本' })).json()).props.preview.inputMode).toBe('text');
      expect((await post({ value: JSON.stringify({ Variables: [], TemplateText: '{{#if' }) })).status).toBe(400);
      expect((await post({}, 'fake_key')).status).toBe(403);
      expect(await snapshot()).toEqual(before);
      expect((await (await app.request('/templates', { headers: { cookie, 'X-VoidPages': 'true' } })).json()).props.preview).toBeNull();
      expect((await app.request('/templates?preview', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, body: '{}' })).status).not.toBe(200);
    } finally { await repo.close(); }
  });
  it('从页面建房和模板到旧推送 URL、真实发送适配、历史与统计形成闭环', async () => {
    const dispatcher = getGlobalDispatcher();
    const outbound = new MockAgent();
    outbound.disableNetConnect();
    setGlobalDispatcher(outbound);
    const repo = openDatabase();
    try {
      const action = (path: string, body: object) => app.request(path, { method: 'POST', headers: { origin: 'http://localhost', cookie, 'content-type': 'application/json' }, body: JSON.stringify({ ...body, csrf }) });
      expect((await action('/rooms?save', { id: 0, name: '闭环房间', code: 'flow-room', key: 'fake_secret' })).status).toBe(200);
      expect((await action('/channels?save', { id: 0, name: '闭环管道', type: 6, url: 'https://example.invalid/fake_key', ...disabledProxy, config: '' })).status).toBe(200);
      expect((await action('/templates?save', { id: 0, name: '闭环模板', code: 'flow-template', value: JSON.stringify({ Variables: [{ VariableName: 'a', JsonPath: '$.text' }, { VariableName: 'title', JsonPath: '$.title' }], TemplateText: '{{a}}|{{title}}' }) })).status).toBe(200);
      const room = (await repo.one('rooms', { code: 'flow-room' }))!;
      const channel = (await repo.one('channels', { name: '闭环管道' }))!;
      expect((await action(`/rooms/${room.id}?channels`, { id: room.id, channelIds: [channel.id] })).status).toBe(200);
      const expected = '&lt;告警&gt;|正文标题';
      outbound.get('https://example.invalid').intercept({ path: '/fake_key', method: 'POST', body: expected }).reply(200, '{}');
      const send = (query: string, body = JSON.stringify({ content: { text: '<告警>', title: '正文标题' }, title: '透传标题' })) => app.request('/pusher.webapi/Room/SendMessageByPost/flow-room?' + query, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      expect(await (await send('roomKey=fake_key&templateCode=flow-template')).json()).toMatchObject({ code: 20000, data: '房间flow-room接收请求：False' });
      expect(await (await send('roomKey=fake_secret&messageType=Image')).json()).toMatchObject({ code: 20000, data: '房间flow-room接收请求：False' });
      expect(await (await send('roomKey=fake_secret', '{')).json()).toMatchObject({ code: 50000, message: '参数验证错误' });
      expect(await repo.all('messages', { roomId: room.id })).toEqual([]);
      expect(await repo.all('histories', { channelId: channel.id })).toEqual([]);
      expect(await (await send('RoomKey=fake_secret&templateCode=flow-template&title=查询标题')).json()).toEqual({ code: 20000, message: 'Success', data: '房间flow-room接收请求：True' });
      const [message] = await repo.all('messages', { roomId: room.id });
      expect(message?.content).toBe(expected);
      expect(await repo.all('histories', { messageId: message!.id })).toMatchObject([{ channelId: channel.id, status: 1, success: true }]);
      const history = await (await app.request(`/rooms/${room.id}`, { headers: { cookie, 'X-VoidPages': 'true' } })).json();
      expect(history.props.history.items[0].content).toBe(expected);
      const stats = await (await app.request('/?days=7', { headers: { cookie, 'X-VoidPages': 'true' } })).json();
      expect(stats.props.stats.byRoom).toContainEqual({ name: '闭环房间', count: 1 });
      outbound.get('https://example.invalid').intercept({ path: '/fake_key', method: 'POST', body: '第二条' }).reply(200, '{}');
      expect(await (await app.request('/pusher.webapi/Room/SendMessageByGet/flow-room?RoomKey=fake_secret&Content=第二条&templateCode=flow-template')).json()).toMatchObject({ code: 20000, data: '房间flow-room接收请求：True' });
      expect((await repo.all('messages', { roomId: room.id })).map(row => row.content)).toEqual(['第二条', expected]);
      outbound.assertNoPendingInterceptors();
    } finally { setGlobalDispatcher(dispatcher); await outbound.close(); await repo.close(); }
  });
  it('HTTPS 代理后的页面 Action 与 GET/POST 推送入口共用服务', async () => {
    const previousOrigin = process.env.APP_URL;
    process.env.APP_URL = 'https://example.invalid';
    try {
      const request = new Request('http://localhost:3000/rooms?save', { method: 'POST', headers: { origin: 'https://example.invalid', cookie, 'content-type': 'application/json' }, body: JSON.stringify({ id: 0, name: '代理验证房间', code: 'proxy-test', key: 'fake_secret', csrf }) });
      const response = await app.fetch(publicRequest(request, 'https://example.invalid'));
      const html = await response.text();
      expect(response.status, html.slice(0, 300)).toBe(200);
      expect(html).not.toContain('fake_secret');
      const get = await app.request('/pusher.webapi/Room/SendMessageByGet/proxy-test?Content=中文&RoomKey=fake_secret');
      expect(await get.json()).toMatchObject({ code: 20000, data: '房间proxy-test接收请求：True' });
      const post = await app.request('/pusher.webapi/Room/SendMessageByPost/proxy-test?roomKey=fake_secret', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{ "content": "中文" }' });
      expect(await post.json()).toMatchObject({ code: 20000, data: '房间proxy-test接收请求：True' });
    } finally { process.env.APP_URL = previousOrigin; }
  });
  it('资源写操作、详情历史、结构化错误及删除在生产产物中正常工作', async () => {
    const action = (path: string, body: object) => app.request(path, { method: 'POST', headers: { origin: 'http://localhost', cookie, 'content-type': 'application/json' }, body: JSON.stringify({ ...body, csrf }) });
    expect((await action('/rooms?save', { id: 0, name: '验收房间', code: 'acceptance', key: 'fake_secret' })).status).toBe(200);
    expect((await action('/channels?save', { id: 0, name: '验收管道', type: 6, url: 'https://example.invalid/fake_key', ...disabledProxy, config: '' })).status).toBe(200);
    expect((await action('/templates?save', { id: 0, name: '验收模板', code: 'constructor', value: JSON.stringify({ Variables: [], TemplateText: '验收正文' }) })).status).toBe(200);
    const repo = openDatabase();
    try {
      const room = (await repo.one('rooms', { code: 'acceptance' }))!;
      const channel = (await repo.one('channels', { name: '验收管道' }))!;
      const invalid = await action('/channels?save', { id: 0, name: '无效 Bark', type: 4, url: 'https://example.invalid/send', ...disabledProxy, config: JSON.stringify({ settings: { encryptionMode: 'AES128CBC' }, defaults: {} }) });
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toEqual({ message: '管道配置无效，请检查字段、密钥和参数类型' });
      expect((await action(`/rooms/${room.id}?send`, { id: room.id, content: '输入正文', templateCode: 'constructor' })).status).toBe(200);
      for (const path of [`/rooms/${room.id}`, `/channels/${channel.id}`]) {
        const response = await app.request(path, { headers: { cookie } });
        const html = await response.text();
        expect(response.status, path).toBe(200);
        expect(html).not.toContain('fake_secret');
        if (path.startsWith('/rooms/')) {
          expect(html).not.toContain('fake_key');
          expect(html).toContain('验收正文');
        } else {
          expect(html).toContain(channel.url);
        }
      }
      expect((await action('/admin/db?templates', { confirmation: 'RESET' })).status).toBe(200);
      const template = (await repo.one('templates', { code: 'constructor' }))!;
      expect(template.value.TemplateText).toBe('验收正文');
      expect((await action('/templates?delete', { id: template.id })).status).toBe(200);
      expect((await action('/channels?delete', { id: channel.id })).status).toBe(200);
      expect((await action('/rooms?delete', { id: room.id })).status).toBe(200);
      expect(await repo.one('rooms', { id: room.id })).toBeUndefined();
      expect(await repo.all('messages', { roomId: room.id })).toEqual([]);
    } finally { await repo.close(); }
  });
  it('普通用户不能进入管理页或读取、修改管理员房间', async () => {
    const headers = { origin: 'http://localhost', cookie, 'content-type': 'application/json' };
    const created = await app.request('/admin/user?create', { method: 'POST', headers, body: JSON.stringify({ username: 'fake_user', password: 'fake_password', role: 0, csrf }) });
    expect(created.status).toBe(200);
    const login = await app.request('/login?login', { method: 'POST', headers, body: JSON.stringify({ username: 'fake_user', password: 'fake_password', csrf }) });
    const session = login.headers.get('set-cookie')?.match(/pusher_session=([^;]+)/)?.[1];
    expect(session).toBeTruthy();
    const otherCookie = `pusher_session=${session}; pusher_csrf=${csrf}`;
    for (const path of ['/admin', '/admin/dashboard', '/admin/user', '/admin/db']) expect((await app.request(path, { headers: { cookie: otherCookie } })).status).toBe(403);
    for (const [path, body] of [
      ['/admin/user?create', { username: 'fake_username', password: 'fake_password', role: 0 }],
      ['/admin/user?role', { id: 1, role: 0 }], ['/admin/user?delete', { id: 1 }],
      ['/admin/db?templates', { confirmation: 'RESET' }], ['/admin/db?database', { confirmation: 'RESET' }],
    ] as const) expect((await app.request(path, { method: 'POST', headers: { ...headers, cookie: otherCookie }, body: JSON.stringify({ ...body, csrf }) })).status).toBe(403);
    const preview = await app.request('/templates?preview', { method: 'POST', headers: { ...headers, cookie: otherCookie, 'X-VoidPages': 'true' }, body: JSON.stringify({ value: JSON.stringify({ Variables: [], TemplateText: 'fake_info' }), sample: '{}', csrf }) });
    expect(preview.status).toBe(200);
    expect((await preview.json()).props.preview.rendered).toBe('fake_info');
    const repo = openDatabase();
    try {
      const room = (await repo.one('rooms', { code: 'proxy-test' }))!;
      expect((await app.request(`/rooms/${room.id}`, { headers: { cookie: otherCookie } })).status).toBe(404);
      const update = await app.request('/rooms?save', { method: 'POST', headers: { ...headers, cookie: otherCookie }, body: JSON.stringify({ id: room.id, name: '越权修改', code: room.code, key: '', csrf }) });
      expect(update.status).toBe(404);
      expect((await repo.one('rooms', { id: room.id }))?.name).toBe(room.name);
    } finally { await repo.close(); }
  });
  it('退出登录会清除会话 Cookie 并阻止后续受保护页面访问', async () => {
    const response = await app.request('/account?logout', { method: 'POST', headers: { origin: 'http://localhost', cookie, 'content-type': 'application/json' }, body: JSON.stringify({ csrf }) });
    expect([302, 303]).toContain(response.status);
    expect(new URL(response.headers.get('location')!, 'http://localhost').pathname).toBe('/login');
    expect(new URL(response.headers.get('location')!, 'http://localhost').search).toBe('');
    const cleared = response.headers.get('set-cookie') || '';
    expect(cleared).toContain('pusher_session=');
    expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    const anonymousCookie = `pusher_csrf=${csrf}`;
    const protectedPage = await app.request('/', { headers: { cookie: anonymousCookie } });
    expect(protectedPage.status).toBe(302);
    expect(protectedPage.headers.get('location')).toBe('/login');
  });
  it('数据库重置拒绝错误确认，显式 RESET 后清空业务并重建可重复迁移的初始状态', async () => {
    const headers = { origin: 'http://localhost', cookie, 'content-type': 'application/json' };
    const before = openDatabase();
    const users = await before.all('users');
    const rooms = await before.all('rooms');
    try {
      const invalid = await app.request('/admin/db?database', { method: 'POST', headers: { ...headers, 'X-VoidPages': 'true' }, body: JSON.stringify({ confirmation: 'reset', csrf }) });
      // Void 页面校验失败返回带字段 errors 的页面响应，不使用业务异常的 HTTP 400。
      expect(invalid.status).toBe(200);
      expect((await invalid.json()).errors).toHaveProperty('confirmation');
      expect(await before.all('users')).toEqual(users);
      expect(await before.all('rooms')).toEqual(rooms);
    } finally { await before.close(); }
    const response = await app.request('/admin/db?database', { method: 'POST', headers, body: JSON.stringify({ confirmation: 'RESET', csrf }) });
    expect(response.status).toBe(302);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/login');
    await migrateDatabase();
    const after = openDatabase();
    try {
      expect(await after.all('users')).toMatchObject([{ username: 'fake_email', role: 100 }]);
      expect(await after.all('templates')).toHaveLength(4);
      for (const table of ['rooms', 'channels', 'messages', 'histories', 'relations'] as const) expect(await after.all(table)).toEqual([]);
    } finally { await after.close(); }
  });
});
