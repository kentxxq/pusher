import { z } from 'zod';
import { findNodeAtLocation, parseTree } from 'jsonc-parser';
import type { PushInput } from '../shared/domain';
import { channelOptionsSchema, channelKeys, type ChannelOptions, type ChannelKey } from '../shared/channels';
import type { PushService } from './services/push';
import { contentText } from './template-renderer';

const queryValue = (params: URLSearchParams, key: string) => [...params].filter(([name]) => name.toLowerCase() === key.toLowerCase()).map(([, value]) => value).join(',');
export function getInput(params: URLSearchParams): PushInput {
  const content = queryValue(params, 'content');
  if (!content.trim()) throw new Error('content 为必填参数');
  const channelOptions: ChannelOptions = {};
  for (const [name, value] of params) {
    if (name === 'channelOptions') throw new Error('GET 请使用点号渠道参数');
    if (!name.startsWith('channelOptions.')) continue;
    const parts = name.split('.');
    const key = parts[1] as ChannelKey;
    const field = parts[2];
    if (parts.length !== 3 || !channelKeys.includes(key) || !field || ['__proto__', 'constructor', 'prototype'].includes(field)) throw new Error('渠道参数路径无效');
    if (params.getAll(name).length !== 1) throw new Error('渠道参数不能重复');
    const section = channelOptions[key] ??= Object.create(null) as Record<string, unknown>;
    section[field] = value;
  }
  return { content, messageType: 0, templateCode: '', channelOptions, extra: {} };
}
export function postInput(params: URLSearchParams, body: unknown, rawBody?: string): PushInput {
  if (body === undefined || body === null) throw new Error('请求体不能为空');
  const typeText = queryValue(params, 'messageType') || 'Text';
  const messageType = /^\d+$/.test(typeText) ? Number(typeText) : ({ text: 0, image: 1 }[typeText.toLowerCase()]);
  if (messageType === undefined || !Number.isSafeInteger(messageType)) throw new Error('messageType 无效');
  let content = body;
  let channelOptions: ChannelOptions = {};
  if (typeof body === 'object' && !Array.isArray(body)) {
    const object = body as Record<string, unknown>;
    if (Object.hasOwn(object, 'channelOptions')) {
      if (!Object.hasOwn(object, 'content') || object.content === null) throw new Error('携带渠道参数时必须提供 content');
      try { channelOptions = channelOptionsSchema.parse(object.channelOptions); }
      catch { throw new Error('channelOptions 结构或渠道标识无效'); }
    }
    if (Object.hasOwn(object, 'content')) content = contentText(object.content);
  }
  // JsonElement.ToString 对对象和数字保留原 JSON 文本，Webhook 也必须保留该行为。
  if (rawBody !== undefined) {
    const tree = parseTree(rawBody);
    const node = tree && typeof body === 'object' && !Array.isArray(body) ? findNodeAtLocation(tree, ['content']) || tree : tree;
    if (node && ['object', 'array', 'number'].includes(node.type)) content = rawBody.slice(node.offset, node.offset + node.length);
  }
  return { content, messageType, templateCode: queryValue(params, 'templateCode'), channelOptions, extra: {} };
}
export async function pushResponse(push: PushService, code: string, params: URLSearchParams, input: PushInput) {
  z.string().min(1).max(200).parse(code);
  const accepted = await push.external(code, queryValue(params, 'roomKey'), input);
  return { code: 20000, message: 'Success', data: `房间${code}接收请求：${accepted ? 'True' : 'False'}` };
}
