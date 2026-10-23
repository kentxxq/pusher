import { defineHandler, type InferProps } from 'void';
import { actor, services, perform, statisticsDays } from '../../server/http';
import { requireAdmin } from '../../server/services/auth';

export const loader = defineHandler(async c => {
  await perform(async () => requireAdmin(actor(c)));
  const days = statisticsDays(c);
  return { stats: await perform(() => services().system.stats(actor(c), days, true)), days };
});
export type Props = InferProps<typeof loader>;
