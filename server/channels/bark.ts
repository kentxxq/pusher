import { createCipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { encryptionModes } from '../../shared/channels';
import { integerOption, post, type ChannelAdapter } from './base';

export const barkConfig = z.strictObject({ encryptionMode: z.enum(encryptionModes).default('None'), encryptionKey: z.string().optional(), encryptionIv: z.string().optional() }).superRefine((config, context) => {
  if (config.encryptionMode === 'None') return;
  const length = config.encryptionMode.includes('128') ? 16 : 32;
  if (!config.encryptionKey || Buffer.byteLength(config.encryptionKey) !== length) context.addIssue({ code: 'custom', message: `加密密钥需要 ${length} 字节`, path: ['encryptionKey'] });
  if (config.encryptionMode.endsWith('CBC') && config.encryptionIv !== undefined && Buffer.byteLength(config.encryptionIv) !== 16) context.addIssue({ code: 'custom', message: 'CBC IV 需要 16 字节', path: ['encryptionIv'] });
});
export function encryptBark(content: string, value: unknown) {
  const config = barkConfig.parse(value);
  if (config.encryptionMode === 'None') return content;
  const bits = config.encryptionMode.includes('128') ? 128 : 256;
  const iv = config.encryptionMode.endsWith('CBC') ? Buffer.from(config.encryptionIv ?? randomBytes(8).toString('hex')) : null;
  const cipher = createCipheriv(`aes-${bits}-${iv ? 'cbc' : 'ecb'}`, Buffer.from(config.encryptionKey!), iv);
  return Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]).toString('base64');
}
export const bark: ChannelAdapter = {
  settings: barkConfig,
  options: z.strictObject({
    title: z.string().optional(), subtitle: z.string().optional(), group: z.string().optional(),
    icon: z.string().optional(), sound: z.string().optional(), url: z.string().optional(), copy: z.string().optional(),
    level: z.enum(['active', 'timeSensitive', 'passive', 'critical']).optional(),
    badge: integerOption(0).optional(), volume: integerOption(0, 10).optional(),
    isarchive: integerOption(0, 1).optional(), autocopy: integerOption(0, 1).optional(),
  }),
  send(context) {
    const payload = { title: 'pusher', group: 'pusher', ...context.options, body: context.content };
    if (context.settings.encryptionMode === 'None') return post(context, payload);
    const cbc = String(context.settings.encryptionMode).endsWith('CBC');
    const iv = cbc ? String(context.settings.encryptionIv ?? randomBytes(8).toString('hex')) : undefined;
    const ciphertext = encryptBark(JSON.stringify(payload), { ...context.settings, ...(iv ? { encryptionIv: iv } : {}) });
    return post(context, { ciphertext, ...(iv ? { iv } : {}) });
  },
};
