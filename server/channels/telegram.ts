import { z } from 'zod';
import { booleanOption, empty, post, type ChannelAdapter } from './base';

export const telegram: ChannelAdapter = {
  settings: empty,
  options: z.strictObject({
    parse_mode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional(),
    disable_notification: booleanOption.optional(),
    protect_content: booleanOption.optional(),
    disable_web_page_preview: booleanOption.optional(),
    entities: z.array(z.strictObject({ type: z.string().min(1), offset: z.number().int().nonnegative(), length: z.number().int().positive(), url: z.string().optional(), language: z.string().optional(), custom_emoji_id: z.string().optional() })).optional(),
  }),
  send(context) {
    const url = new URL(context.channel.url);
    const chatId = url.searchParams.get('chatId');
    if (!chatId) throw new Error('缺少目标');
    const thread = url.searchParams.get('message_thread_id');
    url.search = '';
    return post(context, { ...context.options, chat_id: chatId, text: context.content, ...(thread ? { message_thread_id: thread } : {}) }, undefined, url.toString());
  },
};
