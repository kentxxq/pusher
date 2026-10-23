import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['tests/**/*.test.ts'], fileParallelism: false, server: { deps: { inline: ['vue-echarts'] } } } });
