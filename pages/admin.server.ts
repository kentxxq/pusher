import { defineHandler } from 'void';
import { actor, perform } from '../server/http';
import { requireAdmin } from '../server/services/auth';
export const loader = defineHandler(async c => {
  await perform(async () => requireAdmin(actor(c)));
  return c.redirect(new URL('/admin/dashboard', c.req.url).toString());
});
