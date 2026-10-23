import { fileURLToPath } from 'node:url';
import { normalizePath, type Plugin } from 'vite';
import colors from 'tailwindcss/colors';

// 与当前 Nuxt UI 默认配色一致；插件与 SSR 首屏变量共用配置。
export const uiColors = { primary: 'green', secondary: 'blue', success: 'green', info: 'blue', warning: 'yellow', error: 'red', neutral: 'slate' } as const;
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const semanticColors = Object.keys(uiColors).filter(name => name !== 'neutral');
const themeCss = `@layer theme {
  :root, :host {
    ${Object.entries(uiColors).flatMap(([name, palette]) => shades.map(shade => `--ui-color-${name}-${shade}: var(--color-${palette}-${shade}, ${colors[palette][shade]});`)).join('\n')}
  }
  :root, :host, .light { ${semanticColors.map(name => `--ui-${name}: var(--ui-color-${name}-500);`).join(' ')} }
  .dark { ${semanticColors.map(name => `--ui-${name}: var(--ui-color-${name}-400);`).join(' ')} }
}`;
const mainCss = normalizePath(fileURLToPath(new URL('../styles/main.css', import.meta.url)));

export const nuxtUiCompatibility: Plugin = {
  name: 'pusher:nuxt-ui-compatibility',
  enforce: 'pre',
  config() {
    return {
      ssr: {
        noExternal: ['@nuxt/ui'],
      },
    };
  },
  // Void 开发 CSS 遍历为虚拟模块添加空字符，Nuxt UI 使用无前缀 ID。
  resolveId(id) { if (id.startsWith('\0virtual:nuxt-ui-')) return id.slice(1); },
  // 当前 Void Vue 渲染器未输出 Unhead 样式，首屏必须随静态资源提供主题变量。
  transform(code, id) {
    if (normalizePath(id.split('?')[0]!) === mainCss) return { code: `${code}\n${themeCss}`, map: null };
  },
};
