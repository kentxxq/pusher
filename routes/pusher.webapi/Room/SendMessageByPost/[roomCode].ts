import { defineHandler } from 'void';
import { services } from '../../../../server/services';
import { postInput, pushResponse } from '../../../../server/push-http';

export const POST = defineHandler(async (c) => {
  const params = new URL(c.req.url).searchParams;
  let input;
  try { const rawBody = await c.req.text(); input = postInput(params, JSON.parse(rawBody), rawBody); } catch { return { code: 50000, message: '参数验证错误', data: '请求体或参数格式错误' }; }
  try { return await pushResponse(services().push, c.req.param('roomCode')!, params, input); }
  catch { return { code: 50000, message: '消息处理失败', data: '' }; }
});
