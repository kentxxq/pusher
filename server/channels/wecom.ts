import { empty, post, type ChannelAdapter } from './base';

export const wecom: ChannelAdapter = {
  settings: empty, options: empty,
  send: context => post(context, { msgtype: 'text', text: { content: context.content } }, 'errcode'),
};
