import { proxyUrl } from '../../shared/proxy';
import { z } from 'zod';
import { empty, type ChannelAdapter } from './base';

export const mail: ChannelAdapter = {
  settings: empty, options: z.strictObject({ subject: z.string().optional() }),
  async send(context) {
    await context.mail(context.channel.url, String(context.options.subject ?? 'pusher'), context.content, proxyUrl(context.channel));
    return true;
  },
};
