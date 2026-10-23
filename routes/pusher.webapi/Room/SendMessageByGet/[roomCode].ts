import { defineHandler } from 'void';
import { services } from '../../../../server/services';
import { getInput, pushResponse } from '../../../../server/push-http';

export const GET = defineHandler(async (c) => {
  const params = new URL(c.req.url).searchParams;
  let input;
  try { input = getInput(params); } catch { return { code: 50000, message: '参数验证错误', data: 'The content field is required.' }; }
  try { return await pushResponse(services().push, c.req.param('roomCode')!, params, input); }
  catch { return { code: 50000, message: '消息处理失败', data: '' }; }
});
