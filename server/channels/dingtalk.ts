import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { empty, post, type ChannelAdapter } from './base';

export const dingtalk: ChannelAdapter = {
  settings: z.strictObject({ signingSecret: z.string().min(1).optional() }), options: empty,
  async send(context) {
    const url = new URL(context.channel.url);
    if (context.settings.signingSecret) {
      const timestamp = String(Date.now());
      const secret = String(context.settings.signingSecret);
      url.searchParams.set('timestamp', timestamp);
      url.searchParams.set('sign', createHmac('sha256', secret).update(`${timestamp}\n${secret}`).digest('base64'));
    }
    return post(context, { msgtype: 'text', text: { content: context.content } }, 'errcode', url.toString());
  },
};
