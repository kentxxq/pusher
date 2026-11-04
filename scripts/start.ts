import { serve } from '@hono/node-server';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import cron from 'node-cron';
import { ZodError } from 'zod';
import { appConfig } from '../server/config';
import { SetupError, errorCode } from '../server/errors';
import { BusinessError } from '../shared/domain';
import { migrateDatabase } from '../server/db/migrations';
import { services, closeServices } from '../server/services';
import { publicRequest } from '../server/request-origin';

let stage = '配置校验';
try {
  const config = appConfig();
  stage = '数据库迁移';
  await migrateDatabase();
  stage = '管理员和模板初始化';
  await services().system.initialize();
  stage = '加载构建产物';
  const { default: app } = await import(pathToFileURL(resolve('dist/ssr/app.js')).href);
  stage = '创建清理调度';
  const task = cron.schedule('0 2 * * *', async () => {
    try { await services().system.clean(); } catch { console.error('定时清理失败'); }
  }, { timezone: process.env.TASK_TIMEZONE || 'Asia/Shanghai', noOverlap: true });
  stage = '启动 HTTP 服务';
  const server = serve({ fetch: (request) => app.fetch(publicRequest(request, config.origin)), port: Number(process.env.PORT || 3000), hostname: process.env.HOST || '0.0.0.0' });
  let stopping = false;
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, async () => {
    if (stopping) return;
    stopping = true;
    await task.destroy();
    server.close(async () => { await closeServices(); process.exit(0); });
  });
  console.log('Pusher 已启动');
} catch (error) {
  console.error(`启动失败，阶段：${stage}`);
  // 不打印数据库驱动的原始异常，避免泄露连接串或 SQL。
  if (error instanceof SetupError || error instanceof BusinessError) console.error(error.message);
  else if (error instanceof ZodError) console.error('配置校验未通过，请核对 JWT_ISSUER、JWT_AUDIENCE、JWT_EXPIRE_DAYS、DB_DIALECT 等配置');
  else {
    const code = errorCode(error);
    if (code) console.error(`错误代码：${code}`);
  }
  await closeServices();
  process.exitCode = 1;
}
