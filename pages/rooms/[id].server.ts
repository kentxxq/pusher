import { defineHandler, type InferProps } from 'void';
import { actor, services, perform, withCsrf, routeId, pageNumber } from '../../server/http';
import { relationSchema, sendSchema, idSchema } from '../../shared/validation';

export const loader = defineHandler(async (c) => ({ ...await perform(() => services().management.roomDetail(actor(c), routeId(c), pageNumber(c))), csrf: c.get('shared').csrf }));
export type Props = InferProps<typeof loader>;
export const actions = {
  channels: defineHandler.withValidator({ body: withCsrf(relationSchema) })(async (c, { body }) => { await perform(() => services().management.linkChannels(actor(c), routeId(c), body.channelIds)); }),
  send: defineHandler.withValidator({ body: withCsrf(sendSchema) })(async (c, { body }) => { await perform(() => services().push.owned(actor(c), routeId(c), { content: body.content, templateCode: body.templateCode, messageType: 0, extra: {} })); }),
  clearKey: defineHandler.withValidator({ body: withCsrf(idSchema) })(async (c) => { await perform(() => services().management.clearRoomKey(actor(c), routeId(c))); }),
};
