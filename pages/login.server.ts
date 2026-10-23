import { defineHandler, type InferProps } from 'void';
import { setCookie } from 'hono/cookie';
import { appConfig } from '../server/config';
import { withCsrf, services, perform } from '../server/http';
import { loginSchema, mailSchema } from '../shared/validation';

export const loader = defineHandler((c) => ({ csrf: c.get('shared').csrf }));
export type Props = InferProps<typeof loader>;
export const actions = {
  login: defineHandler.withValidator({ body: withCsrf(loginSchema) })(async (c, { body }) => {
    const token = await perform(() => services().auth.login(body.username, body.password));
    const config = appConfig();
    setCookie(c, 'pusher_session', token, { httpOnly: true, secure: config.origin.startsWith('https:'), sameSite: 'Lax', path: '/', maxAge: config.days * 86400 });
    return c.redirect(new URL('/', c.req.url).toString());
  }),
  passwordMail: defineHandler.withValidator({ body: withCsrf(mailSchema) })(async (_, { body }) => { await perform(() => services().users.passwordMail(body.username)); }),
};
