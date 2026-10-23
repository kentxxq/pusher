import { randomBytes } from 'node:crypto';
import { defineMiddleware } from 'void';
import { getCookie, setCookie } from 'hono/cookie';
import { appConfig } from '../server/config';
import { services } from '../server/services';
import { equalSecret } from '../server/services/auth';
import '../server/http';

export default defineMiddleware(async (c, next) => {
  const path = c.req.path;
  const clientModule = /^\/(?:pages|components)\/.+\.vue$/.test(path) || /^\/shared\/.+\.ts$/.test(path) || /^\/styles\/.+\.css$/.test(path);
  // Node 开发桥接只在 404 时交还 Vite；客户端源码及样式不能被重定向成登录 HTML。
  if (import.meta.env.DEV && ['GET', 'HEAD'].includes(c.req.method) && clientModule && !/[\\%]/.test(path) && !path.split('/').includes('..')) return c.notFound();
  if (c.req.path.startsWith('/pusher.webapi/')) return next();
  const config = appConfig();
  const current = await services().auth.authenticate(getCookie(c, 'pusher_session'));
  c.set('actor', current);
  let csrf = getCookie(c, 'pusher_csrf');
  if (!csrf) { csrf = randomBytes(32).toString('hex'); setCookie(c, 'pusher_csrf', csrf, { httpOnly: true, sameSite: 'Strict', secure: config.origin.startsWith('https:'), path: '/' }); }
  c.set('shared', { actor: current, csrf });
  c.header('Cache-Control', 'private, no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    if (c.req.header('origin') !== config.origin) return c.json({ message: '请求来源不匹配' }, 403);
    let token: unknown;
    try { const body: unknown = await c.req.raw.clone().json(); token = typeof body === 'object' && body !== null && 'csrf' in body ? body.csrf : null; } catch { return c.json({ message: '请求格式错误' }, 400); }
    const cookie = getCookie(c, 'pusher_csrf');
    if (!cookie || typeof token !== 'string' || !equalSecret(cookie, token)) return c.json({ message: '页面已失效，请刷新后重试' }, 403);
  }
  if (!current && c.req.path !== '/login') {
    if (c.req.method === 'GET') return c.redirect('/login');
    return c.json({ message: '请先登录' }, 401);
  }
  await next();
});
