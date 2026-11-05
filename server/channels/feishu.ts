import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { empty, post, type ChannelAdapter } from './base';

export const feishu: ChannelAdapter = {
  settings: z.strictObject({ signingSecret: z.string().min(1).optional() }), options: empty,
  async send(context) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = context.settings.signingSecret ? {
      timestamp,
      sign: createHmac('sha256', `${timestamp}\n${context.settings.signingSecret}`).update('').digest('base64'),
    } : {};
    return post(context, { msg_type: 'text', content: { text: context.content }, ...signature }, 'code');
  },
};
