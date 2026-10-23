import { defineConfig } from 'vite';
import { voidPlugin } from 'void';
import { voidVue } from '@void/vue/plugin';
import ui from '@nuxt/ui/vite';
import { nuxtUiCompatibility, uiColors } from './scripts/nuxt-ui.ts';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ quiet: true });

// Node 使用自有 dotenv 配置；Void 1.1.12 的 Cloudflare env 插件会拒绝 .env.example。
const nodePlugins = voidPlugin().filter(plugin => plugin.name !== 'void:env-schema');

export default defineConfig({
  server: { host: process.env.HOST || '127.0.0.1', port: Number(process.env.PORT || 3000), strictPort: true },
  ssr: { noExternal: ['@nuxt/ui'] },
  plugins: [nuxtUiCompatibility, nodePlugins, voidVue(), ui({ dts: false, autoImport: false, router: false, colorMode: false, ui: { colors: uiColors } })],
});
