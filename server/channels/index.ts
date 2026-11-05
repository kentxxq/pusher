import { z } from 'zod';
import { channelKeys, type ChannelKey } from '../../shared/channels';
import { BusinessError, type Channel } from '../../shared/domain';
import { dingtalk } from './dingtalk';
import { wecom } from './wecom';
import { feishu } from './feishu';
import { telegram } from './telegram';
import { bark } from './bark';
import { mail } from './mail';
import { webhook } from './webhook';
import { qmsg } from './qmsg';
import type { ChannelAdapter } from './base';

export const adapters: Record<ChannelKey, ChannelAdapter> = { dingtalk, wecom, feishu, telegram, bark, mail, webhook, qmsg };
const envelope = z.strictObject({ version: z.literal(1), settings: z.record(z.string(), z.unknown()), defaults: z.record(z.string(), z.unknown()) });
export function adapterFor(type: number) {
  const key = channelKeys[type];
  if (!key) throw new BusinessError('不支持的管道类型');
  return { key, adapter: adapters[key] };
}
export function parseChannelConfig(type: number, raw: string | null) {
  const { adapter } = adapterFor(type);
  try {
    const value = raw ? JSON.parse(raw) : {};
    // 旧 Bark 配置只有加密字段；其他渠道的非空旧配置无法安全推断用途。
    const legacy = z.record(z.string(), z.unknown()).parse(value);
    if (!Object.hasOwn(legacy, 'version') && type !== 4 && Object.keys(legacy).length) throw new Error();
    const config = Object.hasOwn(legacy, 'version') ? envelope.parse(value) : { version: 1 as const, settings: legacy, defaults: {} };
    return { version: 1 as const, settings: adapter.settings.parse(config.settings), defaults: adapter.options.parse(config.defaults) };
  } catch { throw new BusinessError('管道配置无效，请检查字段、密钥和参数类型'); }
}
export function publicChannelConfig(channel: Channel) {
  try {
    const config = parseChannelConfig(channel.type, channel.config);
    return { settings: config.settings, defaults: config.defaults, invalid: false };
  } catch { return { settings: {} as Record<string, unknown>, defaults: {} as Record<string, unknown>, invalid: true }; }
}
export function saveChannelConfig(type: number, raw: string, previous?: Channel, resetInvalid = false) {
  const { adapter } = adapterFor(type);
  if (previous?.type === type && raw && !resetInvalid) {
    try { parseChannelConfig(type, previous.config); }
    catch { throw new BusinessError('原渠道配置无效，请显式重置后重新配置'); }
  }
  if (!raw) return JSON.stringify(parseChannelConfig(type, previous?.type === type ? previous.config : ''));
  try {
    const edit = z.strictObject({
      settings: z.record(z.string(), z.unknown()), defaults: z.record(z.string(), z.unknown()),
    }).parse(JSON.parse(raw));
    return JSON.stringify({ version: 1, settings: adapter.settings.parse(edit.settings), defaults: adapter.options.parse(edit.defaults) });
  } catch { throw new BusinessError('管道配置无效，请检查字段、密钥和参数类型'); }
}
