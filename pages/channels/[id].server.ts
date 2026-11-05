import { defineHandler, type InferProps } from 'void';
import { actor, services, perform, withCsrf, routeId, pageNumber } from '../../server/http';
import { idSchema } from '../../shared/validation';

export const loader = defineHandler(async (c) => ({ ...await perform(() => services().management.channelDetail(actor(c), routeId(c), pageNumber(c))), csrf: c.get('shared').csrf }));
export type Props = InferProps<typeof loader>;
export const actions = {
  test: defineHandler.withValidator({ body: withCsrf(idSchema) })(async (c) => { await perform(() => services().management.testChannel(actor(c), routeId(c))); }),
};
