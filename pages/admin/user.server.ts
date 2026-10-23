import { defineHandler, type InferProps } from 'void';
import { actor, services, perform, withCsrf, pageNumber } from '../../server/http';
import { createUserSchema, roleSchema, idSchema } from '../../shared/validation';
import { requireAdmin } from '../../server/services/auth';

export const loader = defineHandler(async c => {
  await perform(async () => requireAdmin(actor(c)));
  return { users: await perform(() => services().users.list(actor(c), pageNumber(c))), csrf: c.get('shared').csrf };
});
export type Props = InferProps<typeof loader>;
export const actions = {
  create: defineHandler.withValidator({ body: withCsrf(createUserSchema) })(async (c, { body }) => { await perform(() => services().users.create(actor(c), body)); }),
  role: defineHandler.withValidator({ body: withCsrf(roleSchema) })(async (c, { body }) => { await perform(() => services().users.role(actor(c), body.id, body.role)); }),
  delete: defineHandler.withValidator({ body: withCsrf(idSchema) })(async (c, { body }) => { await perform(() => services().users.remove(actor(c), body.id)); }),
};
