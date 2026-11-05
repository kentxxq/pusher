import { proxyUrl } from '../../shared/proxy';
import { empty, type ChannelAdapter } from './base';

export const webhook: ChannelAdapter = {
  settings: empty, options: empty,
  async send(context) {
    return (await context.transport({ url: context.channel.url, body: context.content, proxy: proxyUrl(context.channel) })).ok;
  },
};
