import { empty, post, type ChannelAdapter } from './base';

export const qmsg: ChannelAdapter = {
  settings: empty, options: empty,
  send: context => post(context, { msg: context.content }, 'success'),
};
