import { serve } from '@hono/node-server';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import cron from 'node-cron';
import { appConfig } from '../server/config';
import { migrateDatabase } from '../server/db/migrations';
import { services, closeServices } from '../server/services';
import { publicRequest } from '../server/request-origin';

try {
  const config = appConfig();
  await migrateDatabase();
  await services().system.initialize();
  const { default: app } = await import(pathToFileURL(resolve('dist/ssr/app.js')).href);
  const task = cron.schedule('0 2 * * *', async () => {
    try { await services().system.clean(); } catch { console.error('定时清理失败'); }
  }, { timezone: process.env.TASK_TIMEZONE || 'Asia/Shanghai', noOverlap: true });
  const server = serve({ fetch: (request) => app.fetch(publicRequest(request, config.origin)), port: Number(process.env.PORT || 3000), hostname: process.env.HOST || '0.0.0.0' });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, async () => { await task.stop(); server.close(async () => { await closeServices(); process.exit(0); }); });
  console.log('Pusher 已启动');
} catch { await closeServices(); console.error('启动失败，请核对环境配置、数据库迁移和构建产物'); process.exitCode = 1; }
