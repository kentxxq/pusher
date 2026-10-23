import { defineHandler, type InferProps } from 'void';
import { actor, services, perform, statisticsDays } from '../server/http';

export const loader = defineHandler(async (c) => {
  const days = statisticsDays(c);
  return { stats: await perform(() => services().system.stats(actor(c), days)), days };
});
export type Props = InferProps<typeof loader>;
