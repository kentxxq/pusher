import { proxyUrl } from '../../shared/proxy';
import { z } from 'zod';
import type { Channel } from '../../shared/domain';
import type { Transport } from '../services/channels';
import type { SendMail } from '../services/mail';

export interface AdapterContext {
  channel: Channel;
  content: string;
  settings: Record<string, unknown>;
  options: Record<string, unknown>;
  transport: Transport;
  mail: SendMail;
}
export interface ChannelAdapter {
  settings: z.ZodType<Record<string, unknown>>;
  options: z.ZodType<Record<string, unknown>>;
  send(context: AdapterContext): Promise<boolean>;
}
export const empty = z.strictObject({});
export const booleanOption = z.preprocess(value => value === 'true' ? true : value === 'false' ? false : value, z.boolean());
export const integerOption = (min: number, max = Number.MAX_SAFE_INTEGER) => z.preprocess(value => typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value, z.number().int().min(min).max(max));
export async function post(context: AdapterContext, payload: unknown, business?: 'errcode' | 'code' | 'success', url = context.channel.url) {
  const response = await context.transport({ url, body: JSON.stringify(payload), proxy: proxyUrl(context.channel) });
  if (!response.ok) return false;
  if (!business) return true;
  const data = z.record(z.string(), z.unknown()).parse(JSON.parse(response.text));
  if (business === 'success') return data.success === true;
  const code = data[business];
  return (typeof code === 'number' || (typeof code === 'string' && code.trim() !== '')) && Number(code) === 0;
}
