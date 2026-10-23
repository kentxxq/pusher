import { describe, expect, it, vi } from 'vitest';
import { createUiNavigation, listUrl } from '../shared/ui-navigation';

function click(overrides: Partial<MouseEvent> = {}) {
  return { button: 0, defaultPrevented: false, preventDefault: vi.fn(), ...overrides } as unknown as MouseEvent;
}

describe('Nuxt UI 使用 Void Pages 导航', () => {
  it('同源站内点击只交给 Void，保留查询与锚点', () => {
    const router = { url: new URL('http://localhost/rooms'), visit: vi.fn() };
    const event = click();
    createUiNavigation(router)(event, { href: '/admin/user?page=2' });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(router.visit).toHaveBeenCalledWith('/admin/user?page=2');
  });
  it.each([
    { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true },
    { button: 1 }, { button: 2 }, { defaultPrevented: true },
    { currentTarget: { hasAttribute: (name: string) => name === 'download' } as unknown as EventTarget },
  ])('保留修饰键、下载或已拦截事件的行为 %j', overrides => {
    const router = { url: new URL('http://localhost/'), visit: vi.fn() };
    const event = click(overrides);
    createUiNavigation(router)(event, { href: '/rooms' });
    expect(router.visit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
  it.each([
    { href: 'https://example.invalid/rooms' }, { href: '/rooms', target: '_blank' },
    { href: '/rooms', target: '_parent' }, { href: '/rooms', external: true }, { href: 'javascript:void(0)' },
  ])('不接管站外、新窗口或特殊链接 %j', link => {
    const router = { url: new URL('http://localhost/'), visit: vi.fn() };
    const event = click();
    createUiNavigation(router)(event, link);
    expect(router.visit).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
  it('查询链接正确编码、搜索回到第一页，分页保留筛选', () => {
    expect(listUrl('/rooms', 1, '中文 &?')).toBe('/rooms?page=1&search=%E4%B8%AD%E6%96%87+%26%3F');
    expect(listUrl('/channels?type=3#results', 2, 'fake_info')).toBe('/channels?type=3&page=2&search=fake_info#results');
    expect(listUrl('/templates?search=old', 1, '')).toBe('/templates?page=1');
  });
  it('同页导航完成也通知关闭菜单，失败则保留菜单状态', async () => {
    const completed = vi.fn();
    const router = { url: new URL('http://localhost/rooms'), visit: vi.fn().mockResolvedValue(undefined) };
    await createUiNavigation(router, completed)(click(), { href: '/rooms' });
    expect(completed).toHaveBeenCalledOnce();
    completed.mockClear();
    router.visit.mockRejectedValue(new Error('fake_info'));
    await expect(createUiNavigation(router, completed)(click(), { href: '/channels' })).rejects.toThrow('fake_info');
    expect(completed).not.toHaveBeenCalled();
  });
});
