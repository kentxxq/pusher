import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import session from '../middleware/01.session';

vi.mock('../server/services', () => ({ services: () => ({ auth: { authenticate: async () => null } }) }));
vi.mock('../server/config', () => ({ appConfig: () => ({ origin: 'http://localhost' }) }));

const app = new Hono().use(session).get('/login', c => c.text('登录页'));
describe('开发模块与登录鉴权的请求边界', () => {
  it.each(['/pages/login.vue', '/pages/layout.vue', '/components/Pagination.vue', '/shared/action-error.ts', '/styles/main.css'])('模块 %s 交还 Vite，不重定向为 HTML', async path => {
    const response = await app.request(path);
    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBeNull();
  });
  it.each(['/rooms', '/admin', '/server/config.ts', '/pages/login.server.ts', '/.env'])('请求 %s 不绕过登录保护', async path => {
    const response = await app.request(path);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/login');
  });
  it('前端模块路径的写请求仍需要来源和 CSRF 校验', async () => {
    const response = await app.request('/pages/login.vue', { method: 'POST' });
    expect(response.status).toBe(403);
  });
});
