import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { setTimeout as delay } from 'node:timers/promises';
import { httpTransport } from '../server/services/channels';

// 保留真实 HTTP 适配，只把重试等待替换为立即完成；所有网络由 MockAgent 拦截。
vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn(async () => {}) }));

describe('HTTP 管道直连的重试边界', () => {
  let agent: MockAgent;
  let previous: ReturnType<typeof getGlobalDispatcher>;
  const request = { url: 'https://example.invalid/fake_key', body: 'fake_info', proxy: null };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    previous = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
  });
  afterEach(async () => { setGlobalDispatcher(previous); await agent.close(); vi.restoreAllMocks(); });

  it('临时失败后重试，成功后停止并返回最终响应', async () => {
    const pool = agent.get('https://example.invalid');
    for (const status of [503, 429, 200]) pool.intercept({ path: '/fake_key', method: 'POST', body: 'fake_info' }).reply(status, status === 200 ? '成功' : '暂时失败');
    expect(await httpTransport(request)).toEqual({ ok: true, text: '成功' });
    agent.assertNoPendingInterceptors();
    expect(vi.mocked(delay).mock.calls.map(call => call[0])).toEqual([2000, 4000]);
  });

  it('连续临时失败最多发送四次，不超过三次重试', async () => {
    agent.get('https://example.invalid').intercept({ path: '/fake_key', method: 'POST', body: 'fake_info' }).reply(503, '暂时失败').times(4);
    expect(await httpTransport(request)).toEqual({ ok: false, text: '暂时失败' });
    agent.assertNoPendingInterceptors();
    expect(vi.mocked(delay).mock.calls.map(call => call[0])).toEqual([2000, 4000, 8000]);
  });

  it('非临时 HTTP 错误不重试', async () => {
    agent.get('https://example.invalid').intercept({ path: '/fake_key', method: 'POST' }).reply(400, '参数错误');
    expect(await httpTransport(request)).toEqual({ ok: false, text: '参数错误' });
    agent.assertNoPendingInterceptors();
    expect(delay).not.toHaveBeenCalled();
  });
});
