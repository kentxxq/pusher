import { defineHandler, type InferProps } from 'void';
import { actor, services, perform, withCsrf } from '../../server/http';
import { resetSchema } from '../../shared/validation';
import { requireAdmin } from '../../server/services/auth';
import { migrateDatabase } from '../../server/db/migrations';
import { closeServices } from '../../server/services';

export const loader = defineHandler(async c => {
  await perform(async () => requireAdmin(actor(c)));
  return { csrf: c.get('shared').csrf };
});
export type Props = InferProps<typeof loader>;
export const actions = {
  templates: defineHandler.withValidator({ body: withCsrf(resetSchema) })(async c => { await perform(() => services().system.resetTemplates(actor(c))); }),
  database: defineHandler.withValidator({ body: withCsrf(resetSchema) })(async c => {
    await perform(async () => { requireAdmin(actor(c)); await closeServices(); await migrateDatabase('reset'); await services().system.initialize(); });
    return c.redirect(new URL('/login', c.req.url).toString());
  }),
};
