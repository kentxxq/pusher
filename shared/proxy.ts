import { z } from 'zod';

export const proxyFields = {
  proxyEnabled: z.boolean().default(false),
  proxyProtocol: z.enum(['http', 'https']).default('http'),
  proxyHost: z.string().trim().max(200).default(''),
  proxyPort: z.number().int().min(1).max(65535).default(8080),
  proxyUsername: z.string().max(200).default(''),
  proxyPassword: z.string().max(200).default(''),
};
export const proxySchema = z.object(proxyFields).superRefine((value, context) => {
  if (!value.proxyEnabled) return;
  try {
    const host = value.proxyHost.includes(':') && !value.proxyHost.startsWith('[') ? `[${value.proxyHost}]` : value.proxyHost;
    const url = new URL(`${value.proxyProtocol}://${host}:${value.proxyPort}`);
    if (!host || /[\s/\\?#@]/.test(host) || !url.hostname || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
  } catch { context.addIssue({ code: 'custom', message: '请输入有效的代理服务器地址', path: ['proxyHost'] }); }
  if (value.proxyPassword && !value.proxyUsername) context.addIssue({ code: 'custom', message: '填写代理密码时需要用户名', path: ['proxyUsername'] });
  if (value.proxyUsername.includes(':')) context.addIssue({ code: 'custom', message: '代理用户名不能包含冒号', path: ['proxyUsername'] });
});
export type ProxySettings = z.output<typeof proxySchema>;
export const disabledProxy: ProxySettings = { proxyEnabled: false, proxyProtocol: 'http', proxyHost: '', proxyPort: 8080, proxyUsername: '', proxyPassword: '' };
export function proxyUrl(value: ProxySettings): string | null {
  const proxy = proxySchema.parse(value);
  if (!proxy.proxyEnabled) return null;
  const host = proxy.proxyHost.includes(':') && !proxy.proxyHost.startsWith('[') ? `[${proxy.proxyHost}]` : proxy.proxyHost;
  const url = new URL(`${proxy.proxyProtocol}://${host}:${proxy.proxyPort}`);
  url.username = encodeURIComponent(proxy.proxyUsername);
  url.password = encodeURIComponent(proxy.proxyPassword);
  return url.toString();
}
