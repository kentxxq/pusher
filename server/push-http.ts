import { z } from 'zod';
import { findNodeAtLocation, parseTree } from 'jsonc-parser';
import type { PushInput } from '../shared/domain';
import type { PushService } from './services/push';
import { contentText } from './template-renderer';

const allowed = new Set(['title', 'group', 'icon', 'sound', 'url', 'isarchive', 'level', 'badge', 'autocopy', 'copy', 'volume']);
const queryValue = (params: URLSearchParams, key: string) => [...params].filter(([name]) => name.toLowerCase() === key.toLowerCase()).map(([, value]) => value).join(',');
export function getInput(params: URLSearchParams): PushInput {
  const content = queryValue(params, 'content');
  if (!content.trim()) throw new Error('content 为必填参数');
  const extra: Record<string, string> = {};
  for (const key of new Set(params.keys())) if (!['content', 'roomkey'].includes(key.toLowerCase())) extra[key] = queryValue(params, key);
  return { content, messageType: 0, templateCode: '', extra };
}
export function postInput(params: URLSearchParams, body: unknown, rawBody?: string): PushInput {
  if (body === undefined || body === null) throw new Error('请求体不能为空');
  const typeText = queryValue(params, 'messageType') || 'Text';
  const messageType = /^\d+$/.test(typeText) ? Number(typeText) : ({ text: 0, image: 1 }[typeText.toLowerCase()]);
  if (messageType === undefined || !Number.isSafeInteger(messageType)) throw new Error('messageType 无效');
  const extra: Record<string, string> = {};
  const setExtra = (key: string, value: string) => { const previous = Object.keys(extra).find(k => k.toLowerCase() === key.toLowerCase()); if (previous) delete extra[previous]; extra[key] = value; };
  for (const key of new Set(params.keys())) if (allowed.has(key.toLowerCase())) setExtra(key, queryValue(params, key));
  let content = body;
  if (typeof body === 'object' && !Array.isArray(body)) {
    for (const [key, value] of Object.entries(body)) {
      if (key === 'content') content = contentText(value);
      if (allowed.has(key.toLowerCase())) setExtra(key, contentText(value));
    }
  }
  // JsonElement.ToString 对对象和数字保留原 JSON 文本，Webhook 也必须保留该行为。
  if (rawBody !== undefined) {
    const tree = parseTree(rawBody);
    const node = tree && typeof body === 'object' && !Array.isArray(body) ? findNodeAtLocation(tree, ['content']) || tree : tree;
    if (node && ['object', 'array', 'number'].includes(node.type)) content = rawBody.slice(node.offset, node.offset + node.length);
  }
  return { content, messageType, templateCode: queryValue(params, 'templateCode'), extra };
}
export async function pushResponse(push: PushService, code: string, params: URLSearchParams, input: PushInput) {
  z.string().min(1).max(200).parse(code);
  const accepted = await push.external(code, queryValue(params, 'roomKey'), input);
  return { code: 20000, message: 'Success', data: `房间${code}接收请求：${accepted ? 'True' : 'False'}` };
}
