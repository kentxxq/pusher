import { fetch, ProxyAgent } from 'undici';
import { setTimeout as delay } from 'node:timers/promises';
import type { Channel } from '../../shared/domain';
import { sendMail, type SendMail } from './mail';
import { adapterFor, parseChannelConfig } from '../channels';
export { barkConfig, encryptBark } from '../channels/bark';

export interface SendResult { success: boolean; result: string | null }
export interface OutboundRequest { url: string; body: string; proxy: string | null }
export type Transport = (request: OutboundRequest) => Promise<{ ok: boolean; text: string }>;
export const httpTransport: Transport = async ({ url, body, proxy }) => {
  const address = new URL(url);
  if (!['http:', 'https:'].includes(address.protocol)) throw new Error('不支持的管道协议');
  const proxyAddress = proxy ? new URL(proxy) : undefined;
  const dispatcher = proxyAddress ? new ProxyAgent({ uri: proxy!, ...(proxyAddress.username || proxyAddress.password ? { token: `Basic ${Buffer.from(`${decodeURIComponent(proxyAddress.username)}:${decodeURIComponent(proxyAddress.password)}`).toString('base64')}` } : {}) }) : undefined;
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

export class ChannelSender {
  constructor(private readonly transport: Transport = httpTransport, private readonly mail: SendMail = sendMail) {}
  async send(channel: Channel, content: string, options: Record<string, unknown> = {}): Promise<SendResult> {
    try {
      const { adapter } = adapterFor(channel.type);
      const config = parseChannelConfig(channel.type, channel.config);
      let messageOptions;
      try { messageOptions = adapter.options.parse({ ...config.defaults, ...options }); }
      catch { return { success: false, result: '渠道专属参数无效，请检查字段及类型' }; }
      const success = await adapter.send({ channel, content, settings: config.settings, options: messageOptions, transport: this.transport, mail: this.mail });
      return { success, result: success ? null : '第三方服务返回失败或无效的业务状态' };
    } catch { return { success: false, result: '管道发送失败，请检查管道配置、代理或网络' }; }
  }
}
