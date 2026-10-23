import type { CloudContext } from 'void';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { BusinessError, type Actor } from '../shared/domain';
import { services } from './services';
import type { TemplatePreview } from './template-renderer';

declare module 'void' {
  interface CloudContextVariables {
    actor: Actor | null;
    shared: { actor: Actor | null; csrf: string };
    templatePreview: (TemplatePreview & { page: number; search: string }) | undefined;
  }
}
export function actor(c: CloudContext): Actor {
  const value = c.get('actor');
  if (!value) throw new HTTPException(401, { message: '请先登录' });
  return value;
}
export async function perform<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof BusinessError) throw actionException(error.status, error.message);
    reportOperationError(error);
    throw actionException(500, '操作失败，请检查服务器配置或数据库状态');
  }
}
function reportOperationError(error: unknown) {
  // Drizzle 会把驱动错误放在 cause 中。只记录受控代码，不打印 SQL、参数或原始消息。
  let current = error;
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    const detail = current as { code?: unknown; errno?: unknown; sqlState?: unknown; cause?: unknown };
    if (typeof detail.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(detail.code)) {
      console.error('[pusher] 服务端操作失败', {
        code: detail.code,
        ...(typeof detail.errno === 'number' && Number.isSafeInteger(detail.errno) ? { errno: detail.errno } : {}),
        ...(typeof detail.sqlState === 'string' && /^[0-9A-Z]{5}$/.test(detail.sqlState) ? { sqlState: detail.sqlState } : {}),
      });
      return;
    }
    current = detail.cause;
  }
  console.error('[pusher] 服务端操作失败', { code: 'UNKNOWN' });
}
function actionException(status: number, message: string) {
  return new HTTPException(status as ContentfulStatusCode, { message, res: Response.json({ message }, { status: status as ContentfulStatusCode }) });
}
export function pageNumber(c: CloudContext) { return Math.max(1, Number(c.req.query('page')) || 1); }
export function statisticsDays(c: CloudContext) {
  const result = z.coerce.number().int().min(1).max(60).safeParse(c.req.query('days') ?? 7);
  if (!result.success) throw actionException(400, '时间周期必须为 1–60 天的整数');
  return result.data;
}
export function routeId(c: CloudContext) {
  const result = z.coerce.number().int().positive().safeParse(c.req.param('id'));
  if (!result.success) throw new HTTPException(404, { message: '记录不存在' });
  return result.data;
}
export function withCsrf<T extends z.ZodRawShape>(schema: z.ZodObject<T>) { return schema.extend({ csrf: z.string().min(1) }); }
export { services };
