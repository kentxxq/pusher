// 使用显式 APP_URL 统一请求来源，支持 HTTPS 反向代理；不信任客户端转发头。
export function publicRequest(request: Request, origin: string) {
  const url = new URL(request.url);
  if (url.origin === origin) return request;
  // Node 适配器提供轻量 Request，不能将其直接用作 RequestInit。
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: request.signal,
  };
  if (init.body) init.duplex = 'half';
  return new Request(`${origin}${url.pathname}${url.search}`, init);
}
