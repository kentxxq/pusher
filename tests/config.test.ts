import { describe, expect, it } from 'vitest';
import { databaseConfig } from '../server/config';
import { publicRequest } from '../server/request-origin';

describe('数据库配置', () => {
  it('仅校验当前方言需要的配置', () => {
    expect(databaseConfig({ DB_DIALECT: 'sqlite', SQLITE_PATH: ':memory:', DATABASE_URL: 'fake_url' })).toEqual({ dialect: 'sqlite', path: ':memory:' });
    expect(databaseConfig({ DATABASE_URL: 'mysql://fake_user:fake_password@localhost/pusher_ai_test' })).toEqual({ dialect: 'mysql', url: 'mysql://fake_user:fake_password@localhost/pusher_ai_test' });
  });
  it('拒绝无效方言、连接串和空路径', () => {
    expect(() => databaseConfig({ DB_DIALECT: 'pg' })).toThrow();
    expect(() => databaseConfig({ DATABASE_URL: 'fake_url' })).toThrow();
    expect(() => databaseConfig({ DB_DIALECT: 'sqlite', SQLITE_PATH: '' })).toThrow();
  });
  it('反向代理下使用配置的来源，保留 Action 请求体和查询', async () => {
    const request = new Request('http://localhost:3000/rooms?save', { method: 'POST', headers: { origin: 'https://example.invalid', 'content-type': 'application/json', 'x-forwarded-host': 'fake_url' }, body: '{"csrf":"fake_key"}' });
    const forwarded = publicRequest(request, 'https://example.invalid');
    expect(forwarded.url).toBe('https://example.invalid/rooms?save');
    expect(forwarded.headers.get('origin')).toBe('https://example.invalid');
    expect(await forwarded.json()).toEqual({ csrf: 'fake_key' });
  });
});
