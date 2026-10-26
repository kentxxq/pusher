import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const window = new Window({ url: 'http://localhost/login', settings: { disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
const globals = ['window', 'document', 'navigator', 'location', 'history', 'localStorage', 'Storage', 'Node', 'NodeFilter', 'Element', 'HTMLElement', 'SVGElement', 'Event', 'MouseEvent', 'PointerEvent', 'KeyboardEvent', 'FocusEvent', 'StorageEvent', 'CustomEvent', 'MutationObserver', 'ResizeObserver', 'Document', 'DocumentFragment', 'ShadowRoot', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLDivElement', 'HTMLAnchorElement', 'CSS', 'CSSStyleSheet'] as const;
for (const name of globals) Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? window : window[name] });
Object.assign(globalThis, { getComputedStyle: window.getComputedStyle.bind(window), requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window), matchMedia: window.matchMedia.bind(window) });
const html = readFileSync(process.argv[2]!, 'utf8').replace(/<script\b[^>]*\btype="module"[^>]*>[\s\S]*?<\/script>/g, '');
window.document.write(html);
// 页面请求直接交给构建产物，不监听端口，不访问外部网络。
const initialPage = JSON.parse(document.getElementById('__VOID_PAGE_DATA__')!.textContent!);
const cookies = new Map<string, string>([['pusher_csrf', initialPage.shared.csrf]]);
const app = (await import(pathToFileURL(process.argv[4]!).href)).default;
let pageRequests = 0;
globalThis.fetch = async (input, init) => {
  let request = input instanceof Request ? new Request(input, init) : new Request(new URL(String(input), window.location.href), init);
  assert.equal(new URL(request.url).origin, 'http://localhost');
  let redirected = false;
  for (let count = 0; count < 5; count++) {
    const headers = new Headers(request.headers);
    headers.set('cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '));
    if (!['GET', 'HEAD'].includes(request.method)) headers.set('origin', 'http://localhost');
    const response = await app.fetch(new Request(request, { headers }));
    const setCookie = response.headers.get('set-cookie') || '';
    for (const name of ['pusher_session', 'pusher_csrf']) {
      const value = setCookie.match(new RegExp(`${name}=([^;,]*)`))?.[1];
      if (value !== undefined) { if (value) cookies.set(name, value); else cookies.delete(name); }
    }
    pageRequests++;
    if ([301, 302, 303].includes(response.status)) {
      const url = new URL(response.headers.get('location')!, request.url);
      assert.equal(url.origin, 'http://localhost');
      headers.delete('content-type');
      request = new Request(url, { method: 'GET', headers });
      redirected = true;
      continue;
    }
    Object.defineProperties(response, { redirected: { value: redirected }, url: { value: request.url } });
    return response;
  }
  throw new Error('测试请求重定向次数超限');
};
async function until(check: () => boolean, description: string) {
  const deadline = Date.now() + 5000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`${description}（当前 URL：${window.location.pathname + window.location.search}，标题：${document.querySelector('h1')?.textContent ?? '无'}）`);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
function inputValue(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
for (const link of window.document.querySelectorAll('link[rel="modulepreload"]')) link.remove();
for (const link of window.document.querySelectorAll('link[rel="stylesheet"]')) {
  link.setAttribute('href', new URL(link.getAttribute('href')!, pathToFileURL(process.argv[3]!)).href);
}
let root: HTMLElement | null = null;
try {
  await import(pathToFileURL(process.argv[3]!).href);
  root = document.getElementById('app');
  assert.equal(root?.getAttribute('data-hydrated'), 'true');
  assert.equal(root.querySelector('input[type="email"]'), null);
  const button = Array.from(root.querySelectorAll('button')).find(button => button.textContent?.includes('注册 / 忘记密码'))!;
  button.click();
  await Promise.resolve();
  assert.ok(root.querySelector('input[type="email"]'));
  assert.equal(root.querySelector('input[type="password"]'), null);
  const back = Array.from(root.querySelectorAll('button')).find(button => button.textContent?.includes('返回登录'))!;
  back.click();
  await Promise.resolve();
  assert.ok(root.querySelector('input[type="password"]'));
  assert.equal(root.querySelector('input[type="email"]'), null);
  console.log('登录表单切换通过');
  inputValue('input[autocomplete="username"]', 'fake_username');
  inputValue('input[autocomplete="current-password"]', 'fake_password');
  root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => document.querySelector('h1')?.textContent === '消息概览', '登录后显示概览');
  assert.ok(document.querySelector('a[href="/admin/user"]'), '登录后管理员菜单响应式出现');
  document.querySelector('input[role="spinbutton"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
  await until(() => new URL(window.location.href).searchParams.get('days') === '8', '周期选择通过 Void 导航更新 Loader');
  for (const [path, title] of [['/rooms', '房间管理'], ['/channels', '推送管道'], ['/templates', '字符串模板'], ['/account', '账号设置'], ['/admin/dashboard', '全局仪表盘'], ['/admin/user', '用户管理'], ['/admin/db', '数据库管理']]) {
    const before = pageRequests;
    const link = document.querySelector<HTMLAnchorElement>(`[data-slot="root"][data-collapsed] a[href="${path}"]`);
    assert.ok(link, `侧栏包含 ${path} 导航入口`);
    link.click();
    await until(() => window.location.pathname === path && document.querySelector('h1')?.textContent === title, `导航到 ${path}`);
    assert.ok(pageRequests > before, '导航通过客户端请求 Loader');
    assert.equal(document.getElementById('app'), root);
    if (['/rooms', '/channels', '/templates', '/admin/user'].includes(path!)) assert.ok(document.querySelector('table'), '列表由 UTable 渲染');
    if (path === '/rooms') assert.equal(document.querySelectorAll('table tbody tr').length, 20, 'UTable 完整显示 Loader 的 20 条记录');
    if (path?.startsWith('/admin/')) assert.ok(document.querySelector(`a[href="${path}"]`)!.classList.contains('text-primary'), '管理子页面独立高亮');
  }
  document.querySelector<HTMLAnchorElement>('a[href="/admin/user"]')!.click();
  await until(() => window.location.pathname === '/admin/user' && document.querySelector('a[href="/admin/user"]')!.classList.contains('text-primary'), '管理员子页导航与菜单高亮');
  document.querySelector<HTMLAnchorElement>('a[title="下一页"]')!.click();
  await until(() => new URL(window.location.href).searchParams.get('page') === '2' && document.querySelectorAll('table tbody tr').length === 1, '用户列表按独立子页地址分页');
  document.querySelector<HTMLAnchorElement>('a[href="/templates"]')!.click();
  await until(() => document.querySelector('h1')?.textContent === '字符串模板', '打开模板列表');
  const clickText = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === text)!.click();
  const previewDraft = () => document.querySelector<HTMLButtonElement>('button[aria-label="预览模板草稿"]')!.click();
  clickText('新建模板');
  await until(() => document.querySelector('input[name="templateName"]') !== null, '新建弹窗打开');
  inputValue('input[name="templateName"]', 'fake_info 模板');
  inputValue('input[name="templateCode"]', 'fake_info-preview');
  clickText('添加变量');
  await until(() => document.querySelector('input[name="variable-1"]') !== null, '添加变量行');
  previewDraft();
  await until(() => [...document.querySelectorAll('[role="dialog"] [role="alert"]')].some(element => element.textContent), '空变量定位字段错误');
  document.querySelector<HTMLButtonElement>('button[aria-label="删除变量 2"]')!.click();
  inputValue('textarea[name="sampleContent"]', '普通文本');
  previewDraft();
  await until(() => document.querySelector('pre[aria-label="渲染正文"]')?.textContent === '普通文本', '预览草稿正文');
  inputValue('textarea[name="sampleContent"]', '{"content":');
  previewDraft();
  await until(() => document.querySelector('pre[aria-label="渲染正文"]')?.textContent === '{&quot;content&quot;:', '非法 JSON 按普通文本渲染');
  inputValue('textarea[name="sampleContent"]', '{"content":"fake_info"}');
  previewDraft();
  await until(() => document.querySelector('pre[aria-label="渲染正文"]')?.textContent === 'fake_info', 'JSON 预览更新');
  inputValue('textarea[name="templateText"]', '修改 {{ content }}');
  await until(() => document.body.textContent?.includes('预览已过期') === true, '修改草稿标记预览过期');
  document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => document.querySelector('[role="dialog"]') === null && document.querySelector('table')?.textContent?.includes('fake_info 模板') === true, '保存成功关闭并刷新列表');
  const row = [...document.querySelectorAll('table tbody tr')].find(row => row.textContent?.includes('fake_info 模板'))!;
  [...row.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === '编辑')!.click();
  await until(() => document.querySelector<HTMLTextAreaElement>('textarea[name="templateText"]')?.value === '修改 {{ content }}', '编辑回填正文');
  inputValue('textarea[name="templateText"]', '取消的草稿');
  clickText('取消');
  await until(() => document.querySelector('[role="dialog"]') === null, '取消关闭');
  [...row.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === '编辑')!.click();
  await until(() => document.querySelector<HTMLTextAreaElement>('textarea[name="templateText"]')?.value === '修改 {{ content }}', '取消不修改列表对象');
  inputValue('input[name="templateName"]', '');
  document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => document.querySelector('[role="dialog"] form')?.getAttribute('aria-busy') === 'false' && [...document.querySelectorAll('[role="dialog"] [data-slot="error"]')].some(element => element.textContent?.includes('不能为空')), '保存失败显示名称字段错误并保留草稿');
  assert.equal(document.querySelector<HTMLTextAreaElement>('textarea[name="templateText"]')?.value, '修改 {{ content }}');
  clickText('取消');
  await until(() => document.querySelector('[role="dialog"]') === null, '关闭编辑弹窗');
  console.log('模板结构化编辑与预览通过');
  document.querySelector<HTMLAnchorElement>('[data-slot="root"][data-collapsed] a[href="/rooms"]')!.click();
  await until(() => window.location.pathname === '/rooms' && document.querySelector('h1')?.textContent === '房间管理', '返回房间');
  const firstRoom = document.querySelector('table tbody tr')!;
  const originalRoomName = firstRoom.querySelector('td')!.textContent;
  assert.ok(firstRoom.textContent?.includes('已加密'), '使用已设置密钥的房间验证密钥不回显');
  [...firstRoom.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === '修改')!.click();
  await until(() => document.querySelector<HTMLInputElement>('[role="dialog"] input')?.value === originalRoomName, '编辑房间回填名称');
  assert.equal(document.querySelector<HTMLInputElement>('[role="dialog"] input[type="password"]')?.value, '', '房间密钥不回显');
  clickText('取消');
  await until(() => document.querySelector('[role="dialog"]') === null, '关闭房间编辑');
  clickText('新建房间');
  await until(() => document.querySelector('[role="dialog"] input') !== null, '新建房间打开');
  assert.ok([...document.querySelectorAll<HTMLInputElement>('[role="dialog"] input')].every(input => input.value === ''), '编辑后新建清空旧值');
  clickText('取消');
  await until(() => document.querySelector('[role="dialog"]') === null, '关闭房间新建');
  document.querySelector<HTMLAnchorElement>('a[title="下一页"]')!.click();
  await until(() => new URL(window.location.href).searchParams.get('page') === '2' && document.querySelectorAll('table tbody tr').length === 1, 'Loader 第二页仅显示剩余一条');
  window.history.back();
  await until(() => !new URL(window.location.href).searchParams.has('page') && document.querySelectorAll('table tbody tr').length === 20, '后退恢复列表与 URL');
  window.history.forward();
  await until(() => new URL(window.location.href).searchParams.get('page') === '2' && document.querySelectorAll('table tbody tr').length === 1, '前进恢复第二页');
  inputValue('input[name="search"]', 'fake_info & 中文');
  document.querySelector('form[action="/rooms"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => new URL(window.location.href).searchParams.get('search') === 'fake_info & 中文', '搜索更新 URL');
  assert.equal(new URL(window.location.href).searchParams.get('page'), '1');
  await until(() => document.querySelectorAll('table tbody tr').length === 20, '搜索结果仍由 Loader 分页');
  const next = document.querySelector<HTMLAnchorElement>('a[title="下一页"]')!;
  assert.equal(new URL(next.href).searchParams.get('search'), 'fake_info & 中文');
  const historyLength = window.history.length;
  inputValue('input[name="search"]', 'fake_info & 中文 20');
  document.querySelector('form[action="/rooms"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => new URL(window.location.href).searchParams.get('search') === 'fake_info & 中文 20' && document.querySelectorAll('table tbody tr').length === 1 && document.querySelector('table tbody tr td')?.textContent?.trim() === 'fake_info & 中文 20', '搜索由 Loader 筛选为唯一匹配房间');
  assert.equal(window.history.length, historyLength, '搜索替换当前历史记录');
  assert.equal(new URL(window.location.href).searchParams.get('page'), '1');
  assert.equal(document.querySelector('a[title="下一页"]'), null, '单条搜索结果没有下一页');
  document.querySelector<HTMLButtonElement>('button[title="刷新列表并清空搜索"]')!.click();
  await until(() => !new URL(window.location.href).searchParams.has('search') && document.querySelectorAll('table tbody tr').length === 20, '刷新清空搜索并恢复第一页');
  assert.equal(document.querySelector<HTMLInputElement>('input[name="search"]')?.value, '');
  const menu = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === '菜单')!;
  menu.click();
  await until(() => menu.getAttribute('aria-expanded') === 'true' && document.querySelector('[role="dialog"] a[href="/channels"]') !== null, '移动端菜单打开');
  document.querySelector<HTMLAnchorElement>('[role="dialog"] a[href="/channels"]')!.click();
  await until(() => document.querySelector('h1')?.textContent === '推送管道' && menu.getAttribute('aria-expanded') === 'false', '导航后移动端侧栏关闭');
  await until(() => document.querySelector('[role="dialog"]') === null, '关闭后的侧栏移除');
  menu.click();
  await until(() => document.querySelector('[role="dialog"] a[href="/channels"]') !== null, '再次打开移动端侧栏');
  document.querySelector<HTMLAnchorElement>('[role="dialog"] a[href="/channels"]')!.click();
  await until(() => menu.getAttribute('aria-expanded') === 'false', '点击当前页面也关闭侧栏');
  await until(() => document.querySelector('[role="dialog"]') === null, '同页导航侧栏关闭完成');
  clickText('新建管道');
  await until(() => document.querySelector('[role="dialog"] input') !== null, '新建管道打开');
  inputValue('[role="dialog"] input:not([type="password"])', 'fake_info');
  inputValue('[role="dialog"] input[type="password"]', 'https://example.invalid/fake_key');
  document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await until(() => document.querySelector('[role="dialog"]') === null && document.querySelector('table')?.textContent?.includes('fake_info') === true, '新建管道保存成功');
  [...document.querySelectorAll<HTMLButtonElement>('table button')].find(button => button.textContent?.trim() === '编辑')!.click();
  await until(() => document.querySelector<HTMLInputElement>('[role="dialog"] input')?.value === 'fake_info', '编辑管道回填名称');
  assert.ok([...document.querySelectorAll<HTMLInputElement>('[role="dialog"] input[type="password"]')].every(input => input.value === ''), '管道凭据不回显');
  clickText('取消');
  await until(() => document.querySelector('[role="dialog"]') === null, '关闭管道编辑');
  clickText('新建管道');
  await until(() => document.querySelector('[role="dialog"] input') !== null, '再次新建管道');
  assert.equal(document.querySelector<HTMLInputElement>('[role="dialog"] input')?.value, '', '再次新建清空管道名称');
  clickText('取消');
  await until(() => document.querySelector('[role="dialog"]') === null, '关闭管道新建');
  document.querySelector<HTMLButtonElement>('button[aria-label="Collapse sidebar"]')!.click();
  await until(() => document.querySelector('[data-dragging][data-collapsed="true"]') !== null, '桌面侧栏折叠');
  const sidebar = document.querySelector('[data-dragging][data-collapsed="true"]')!;
  assert.equal(sidebar.querySelector('[data-slot="header"] a'), null, '折叠后隐藏品牌链接');
  assert.ok(sidebar.querySelector('[data-slot="header"] .justify-center'), '折叠按钮居中');
  const savedLayout = JSON.parse(localStorage.getItem('pusher-dashboard-layout-sidebar-pusher-sidebar')!);
  assert.equal(savedLayout.collapsed, true, '折叠状态写入本地存储');
  assert.equal(savedLayout.size, 16);
  const userButton = document.querySelector<HTMLButtonElement>('button[aria-label="fake_username的账号菜单"]')!;
  userButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await until(() => [...document.querySelectorAll('[role="menuitem"]')].some(item => item.textContent?.includes('退出登录')), '用户名菜单展示退出入口');
  const logout = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(item => item.textContent?.includes('退出登录'))!;
  logout.click();
  await until(() => document.querySelector('input[autocomplete="current-password"]') !== null && window.location.pathname === '/login', '退出后返回登录页');
  assert.equal(document.querySelector('[data-slot="root"][data-dragging]'), null);
  assert.equal(cookies.has('pusher_session'), false);
  console.log('Void 导航与用户菜单通过');
} finally {
  (root as (HTMLElement & { __vue_app__?: { unmount(): void } }) | null)?.__vue_app__?.unmount();
  await window.happyDOM.abort();
  window.happyDOM.close();
}
