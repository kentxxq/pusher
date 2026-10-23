import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe.skipIf(!existsSync('dist/client/assets'))('客户端模块隔离', () => {
  it('首屏 CSS 包含按钮和边框需要的 Nuxt UI 主题变量', () => {
    const css = readdirSync('dist/client/assets').filter(name => name.endsWith('.css')).map(name => readFileSync(join('dist/client/assets', name), 'utf8')).join('\n');
    expect(css).toContain('--ui-primary:');
    expect(css).toContain('--ui-color-primary-500:');
    expect(css).toContain('--ui-color-neutral-200:');
    expect(css).toContain('.bg-primary');
  });
  it('不包含数据库、JWT 签名、SMTP 和初始化凭据', () => {
    const assets = readdirSync('dist/client/assets').filter(name => name.endsWith('.js')).map(name => readFileSync(join('dist/client/assets', name), 'utf8')).join('\n');
    for (const secret of ['DATABASE_URL', 'JWT_KEY', 'SMTP_PASSWORD', 'ADMIN_PASSWORD', 'better-sqlite3', 'mysql2', 'nodemailer']) expect(assets).not.toContain(secret);
  });
});
