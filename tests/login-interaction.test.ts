import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { migrateDatabase } from '../server/db/migrations';
import { openDatabase } from '../server/db/connection';
import { createServices } from '../server/services';

describe.skipIf(!existsSync('dist/client/.vite/manifest.json'))('生产客户端登录交互（内存 DOM，不启动浏览器）', () => {
  it('真实客户端完成登录切换、Void 导航、搜索、用户菜单和退出', async () => {
    mkdirSync('debug', { recursive: true });
    process.env.DB_DIALECT = 'sqlite';
    process.env.SQLITE_PATH = resolve(`debug/tmpfile-AI-login-${randomUUID()}.sqlite`);
    process.env.JWT_KEY = Buffer.alloc(32, 7).toString('base64');
    process.env.JWT_ISSUER = 'fake_info'; process.env.JWT_AUDIENCE = 'fake_info';
    process.env.ADMIN_USERNAME = 'fake_username'; process.env.ADMIN_PASSWORD = 'fake_password';
    process.env.APP_URL = 'http://localhost';
    await migrateDatabase();
    const services = createServices(openDatabase());
    try {
      await services.system.initialize();
      const user = (await services.repo.one('users', { username: 'fake_username' }))!;
      for (let index = 0; index < 21; index++) {
        await services.management.saveRoom(user, { id: 0, name: `fake_info & 中文 ${index}`, code: `fake_info-${index}`, key: 'fake_secret' });
      }
      for (let index = 0; index < 20; index++) await services.repo.insert('users', { username: `fake_user-${index}`, password: 'fake_password', role: 0, lastLoginTime: null, lastForgetTime: null });
    } finally { await services.repo.close(); }
    const app = (await import(/* @vite-ignore */ pathToFileURL(resolve('dist/ssr/app.js')).href)).default;
    const response = await app.request('/login');
    expect(response.status).toBe(200);
    const htmlPath = resolve(`debug/tmpfile-AI-login-${randomUUID()}.html`);
    writeFileSync(htmlPath, await response.text());
    const manifest = JSON.parse(readFileSync('dist/client/.vite/manifest.json', 'utf8')) as Record<string, { file: string; isEntry?: boolean }>;
    const entry = Object.values(manifest).find(value => value.isEntry)!;
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'tests/fixtures/login-client.ts', htmlPath, resolve('dist/client', entry.file), resolve('dist/ssr/app.js')], { encoding: 'utf8', timeout: 25000 });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr + result.stdout).toBe(0);
    expect(result.stdout).toContain('登录表单切换通过');
    expect(result.stdout).toContain('模板结构化编辑与预览通过');
    expect(result.stdout).toContain('Void 导航与用户菜单通过');
  }, 30000);
});
