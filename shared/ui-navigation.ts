type PageRouter = { readonly url: URL; visit: (href: string) => unknown };
type UiLink = { href: string; external?: boolean; target?: string | null };

export function createUiNavigation(router: PageRouter, onNavigated?: () => void) {
  return (event: MouseEvent, link: UiLink) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.external || (link.target && link.target !== '_self')) return;
    if ((event.currentTarget as HTMLElement | null)?.hasAttribute('download')) return;
    const target = new URL(link.href, router.url);
    if (!['http:', 'https:'].includes(target.protocol) || target.origin !== router.url.origin) return;
    event.preventDefault();
    return Promise.resolve(router.visit(target.pathname + target.search + target.hash)).then(result => {
      onNavigated?.();
      return result;
    });
  };
}

export function listUrl(path: string, page: number, search?: string) {
  const url = new URL(path, 'http://localhost');
  url.searchParams.set('page', String(page));
  if (search) url.searchParams.set('search', search);
  else url.searchParams.delete('search');
  return url.pathname + url.search + url.hash;
}

