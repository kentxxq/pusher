// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { computed, createApp, h, nextTick, ref } from 'vue';
import VChart from 'vue-echarts';
import { statisticsOption } from '../shared/chart-options';

// 只替换 Canvas 引擎，保留实际 vue-echarts 的更新、尺寸监听和销毁逻辑。
const engine = vi.hoisted(() => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), hideLoading: vi.fn(), isDisposed: () => false }));
vi.mock('echarts/core', () => ({ init: () => engine, throttle: (callback: () => void) => callback }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('图表数据更新、容器尺寸变化及卸载均交给 vue-echarts 管理', async () => {
  let resize: (() => void) | undefined;
  const disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect = disconnect;
  });
  const data = ref([{ name: '2026-10-21', count: 2 }]);
  const visible = ref(true);
  const option = computed(() => statisticsOption('line', '每日消息', data.value));
  const container = document.createElement('div');
  document.body.append(container);
  const app = createApp({ setup: () => () => visible.value ? h(VChart, { option: option.value, autoresize: true }) : h('p', '暂无统计数据') });
  try {
    app.mount(container);
    await nextTick(); await nextTick();
    expect(engine.setOption).toHaveBeenCalledWith(option.value, expect.anything());
    data.value = [{ name: '2026-10-20', count: 5 }];
    await nextTick();
    expect(engine.setOption).toHaveBeenLastCalledWith(option.value, expect.objectContaining({ notMerge: true }));
    const before = engine.resize.mock.calls.length;
    resize?.(); resize?.();
    expect(engine.resize.mock.calls.length).toBeGreaterThan(before);
    visible.value = false;
    await nextTick();
    expect(engine.dispose).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalled();
    expect(container.textContent).toBe('暂无统计数据');
  } finally { app.unmount(); container.remove(); }
});
