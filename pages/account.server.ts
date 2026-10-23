import { defineHandler, type InferProps } from 'void';
import { deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import { appConfig } from '../server/config';
import { actor, services, perform, withCsrf } from '../server/http';
import { passwordSchema } from '../shared/validation';

export const loader = defineHandler(async (c) => {
  const currentActor = actor(c);
  const svc = services();
  const dbUser = await svc.repo.one('users', { id: currentActor.id });
  const [rooms, channels] = await Promise.all([
    svc.repo.all('rooms', { userId: currentActor.id }),
    svc.repo.all('channels', { userId: currentActor.id }),
  ]);

  return {
    user: {
      id: currentActor.id,
      username: currentActor.username,
      role: currentActor.role,
      lastLoginTime: dbUser?.lastLoginTime || null,
      roomCount: rooms.length,
      channelCount: channels.length,
    },
    csrf: c.get('shared').csrf,
  };
});
export type Props = InferProps<typeof loader>;
export const actions = {
  password: defineHandler.withValidator({ body: withCsrf(passwordSchema) })(async (c, { body }) => { await perform(() => services().auth.changePassword(actor(c), body.oldPassword, body.newPassword)); }),
  logout: defineHandler.withValidator({ body: withCsrf(z.object({})) })(async (c) => {
    const config = appConfig();
    deleteCookie(c, 'pusher_session', { httpOnly: true, sameSite: 'Lax', secure: config.origin.startsWith('https:'), path: '/' });
    return c.redirect(new URL('/login', c.req.url).toString());
  }),
};
