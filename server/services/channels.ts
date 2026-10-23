import { createCipheriv, randomBytes } from 'node:crypto';
import { fetch, ProxyAgent } from 'undici';
import { z } from 'zod';
import { setTimeout as delay } from 'node:timers/promises';
import type { Channel } from '../../shared/domain';
import { sendMail, type SendMail } from './mail';

export interface SendResult { success: boolean; result: string | null }
export interface OutboundRequest { url: string; body: string; proxy: string | null }
export type Transport = (request: OutboundRequest) => Promise<{ ok: boolean; text: string }>;
export const httpTransport: Transport = async ({ url, body, proxy }) => {
  const address = new URL(url);
  if (!['http:', 'https:'].includes(address.protocol)) throw new Error('不支持的管道协议');
  const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
  try {
    const total = AbortSignal.timeout(proxy ? 100000 : 30000);
    // 旧版直连使用标准弹性处理：30 秒总预算、10 秒单次超时、最多 3 次重试。
    // 代理客户端沿用独立 HttpClient 的单次发送行为。
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/json; charset=utf-8', 'content-length': String(Buffer.byteLength(body)) }, dispatcher, signal: proxy ? total : AbortSignal.any([total, AbortSignal.timeout(10000)]), redirect: 'follow' });
        const text = await response.text();
        if (proxy || attempt >= 3 || ![408, 429, 500, 502, 503, 504].includes(response.status)) return { ok: response.ok, text };
      } catch (error) { if (proxy || attempt >= 3 || total.aborted) throw error; }
      await delay(Math.min(8000, 2000 * 2 ** attempt) * (0.8 + Math.random() * 0.4), undefined, { signal: total });
    }
  } finally { await dispatcher?.close(); }
};

export const barkConfig = z.object({ encryptionMode: z.enum(['None', 'AES128CBC', 'AES128ECB', 'AES256CBC', 'AES256ECB']).default('None'), encryptionKey: z.string().optional(), encryptionIv: z.string().optional() }).superRefine((config, context) => {
  if (config.encryptionMode === 'None') return;
  const length = config.encryptionMode.includes('128') ? 16 : 32;
  if (!config.encryptionKey || Buffer.byteLength(config.encryptionKey) !== length) context.addIssue({ code: 'custom', message: `加密密钥需要 ${length} 字节`, path: ['encryptionKey'] });
  if (config.encryptionMode.endsWith('CBC') && config.encryptionIv !== undefined && Buffer.byteLength(config.encryptionIv) !== 16) context.addIssue({ code: 'custom', message: 'CBC IV 需要 16 字节', path: ['encryptionIv'] });
});
export function encryptBark(content: string, value: unknown) {
  const config = barkConfig.parse(value);
  if (config.encryptionMode === 'None') return content;
  const bits = config.encryptionMode.includes('128') ? 128 : 256;
  const cbc = config.encryptionMode.endsWith('CBC');
  const key = Buffer.from(config.encryptionKey!);
  const iv = cbc ? (config.encryptionIv ? Buffer.from(config.encryptionIv) : randomBytes(16)) : null;
  const cipher = createCipheriv(`aes-${bits}-${cbc ? 'cbc' : 'ecb'}`, key, iv);
  return Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]).toString('base64');
}

export class ChannelSender {
  constructor(private readonly transport: Transport = httpTransport, private readonly mail: SendMail = sendMail) {}
  async send(channel: Channel, content: string, extra: Record<string, string> = {}): Promise<SendResult> {
    try {
      if (channel.type === 5) { await this.mail(channel.url, 'pusher', content, channel.proxy); return { success: true, result: null }; }
      let url = channel.url;
      let payload: unknown;
      switch (channel.type) {
        case 0: case 1: payload = { msgtype: 'text', text: { content } }; break;
        case 2: payload = { msg_type: 'text', content: { text: content } }; break;
        case 3: {
          const parsed = new URL(url);
          payload = { chat_id: parsed.searchParams.get('chatId') || '', text: content, ...(parsed.searchParams.get('message_thread_id') ? { message_thread_id: parsed.searchParams.get('message_thread_id') } : {}), ...extra };
          parsed.search = ''; url = parsed.toString(); break;
        }
        case 4: {
          payload = { body: content, title: 'pusher', group: 'pusher', ...extra };
          const config = barkConfig.parse(channel.config ? JSON.parse(channel.config) : {});
          if (config.encryptionMode !== 'None') payload = { ciphertext: encryptBark(JSON.stringify(payload), config) };
          break;
        }
        case 6: payload = content; break;
        case 7: payload = { msg: content }; break;
        default: return { success: false, result: '不支持的管道类型' };
      }
      const response = await this.transport({ url, body: channel.type === 6 ? content : JSON.stringify(payload), proxy: channel.proxy });
      let success = response.ok;
      if ([0, 1, 2, 7].includes(channel.type)) {
        const data = z.record(z.string(), z.unknown()).parse(JSON.parse(response.text));
        const code = channel.type === 2 ? data.code : data.errcode;
        const hasCode = typeof code === 'number' || (typeof code === 'string' && code.trim() !== '');
        success = response.ok && (channel.type === 7 ? data.success === true : hasCode && Number(code) === 0);
        // 第三方错误文本可能包含凭据或超出旧 Result 字段长度，只记录受控说明。
        return { success, result: success ? null : '第三方服务返回失败或无效的业务状态' };
      }
      // 不持久化第三方原始响应，避免响应中回显管道凭据。
      return { success, result: success ? null : '第三方服务返回失败状态' };
    } catch { return { success: false, result: '管道发送失败，请检查管道配置、代理或网络' }; }
  }
}
