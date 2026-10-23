// 使用显式 APP_URL 统一请求来源，支持 HTTPS 反向代理；不信任客户端转发头。
export function publicRequest(request: Request, origin: string) {
  const url = new URL(request.url);
  if (url.origin === origin) return request;
  return new Request(`${origin}${url.pathname}${url.search}`, request);
}
