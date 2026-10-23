import { defineHandler, type InferProps } from 'void';
import { actor, services, perform, withCsrf, pageNumber } from '../server/http';
import { roomSchema, idSchema } from '../shared/validation';

export const loader = defineHandler(async (c) => ({ list: await perform(() => services().management.rooms(actor(c), pageNumber(c), c.req.query('search') || '')), csrf: c.get('shared').csrf, search: c.req.query('search') || '' }));
export type Props = InferProps<typeof loader>;
export const actions = {
  save: defineHandler.withValidator({ body: withCsrf(roomSchema) })(async (c, { body }) => { await perform(() => services().management.saveRoom(actor(c), body)); }),
  delete: defineHandler.withValidator({ body: withCsrf(idSchema) })(async (c, { body }) => { await perform(() => services().management.remove(actor(c), 'rooms', body.id)); }),
};

