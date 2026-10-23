import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';

describe('开发模式的 Nuxt UI 与 Void 集成（不监听端口）', () => {
  let server: ViteDevServer;
  beforeAll(async () => {
    server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false } });
  });
  afterAll(async () => { await server?.close(); });
  it('解析 Void CSS 遍历使用的 Nuxt UI 虚拟模块 ID', async () => {
    const result = await server.environments.client.transformRequest('\0virtual:nuxt-ui-plugins');
    expect(result?.code).toContain('install');
  });
  it('SSR 首屏样式已包含颜色变量，不依赖客户端注入', async () => {
    const result = await server.environments.client.transformRequest('/styles/main.css?inline');
    expect(result?.code).toContain('--ui-color-primary-500:');
    expect(result?.code).toContain('--ui-color-neutral-200:');
    expect(result?.code).toContain('--ui-primary:');
    expect(result?.code).toContain('--ui-color-primary-500: var(--color-green-500');
    expect(result?.code).toContain('.bg-primary');
  });
  it('开发端口使用环境配置并禁止自动换端口', () => {
    expect(server.config.server.port).toBe(Number(process.env.PORT || 3000));
    expect(server.config.server.strictPort).toBe(true);
  });
});
