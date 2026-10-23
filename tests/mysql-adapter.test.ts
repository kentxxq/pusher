import { afterEach, expect, it, vi } from 'vitest';
import { openDatabase } from '../server/db/connection';

const pool = vi.hoisted(() => ({
  query: vi.fn(async (_query: { sql: string }, _params: unknown[]): Promise<unknown> => [[], []]),
  end: vi.fn(async () => {}),
}));
vi.mock('mysql2/promise', async importOriginal => ({ ...await importOriginal<object>(), createPool: () => pool }));
afterEach(() => vi.clearAllMocks());

it('MySQL 适配器通过真实 Drizzle 保持自增 ID、JSON 映射和 CRUD 参数', async () => {
  const repo = openDatabase({ dialect: 'mysql', url: 'mysql://fake_user:fake_password@localhost/pusher_ai_test_adapter' });
  const value = { Variables: [{ VariableName: 'content', JsonPath: '$.content' }], TemplateText: '{{content}}' };
  try {
    pool.query.mockResolvedValueOnce([{ insertId: 42, affectedRows: 1 }, []]);
    expect(await repo.insert('templates', { name: 'fake_info', code: 'fake_key', value, userId: 7 })).toBe(42);
    expect(pool.query.mock.lastCall?.[1]).toEqual(['fake_info', 'fake_key', JSON.stringify(value), 7]);
    pool.query.mockResolvedValueOnce([[[42, 'fake_info', 'fake_key', JSON.stringify(value), 7]], []]);
    expect(await repo.all('templates', { userId: 7 }, { limit: 20, offset: 20 })).toEqual([{ id: 42, name: 'fake_info', code: 'fake_key', value, userId: 7 }]);
    expect(pool.query.mock.lastCall?.[1]).toEqual([7, 20, 20]);
    expect(pool.query.mock.lastCall?.[0].sql).toContain('order by `StringTemplate`.`Id` desc');
    const updated = { Variables: [], TemplateText: 'fake_info' };
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await repo.update('templates', 42, { value: updated });
    expect(pool.query.mock.lastCall?.[1]).toEqual([JSON.stringify(updated), 42]);
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await repo.remove('templates', 42);
    expect(pool.query.mock.lastCall?.[1]).toEqual([42]);
  } finally { await repo.close(); }
  expect(pool.end).toHaveBeenCalledOnce();
});

it('MySQL 适配器保持布尔映射、计数归一化和 NULL 条件', async () => {
  const repo = openDatabase({ dialect: 'mysql', url: 'mysql://fake_user:fake_password@localhost/pusher_ai_test_adapter' });
  try {
    pool.query.mockResolvedValueOnce([[[1, 2, 3, 1, 0, null]], []]);
    expect(await repo.one('histories', { id: 1 })).toEqual({ id: 1, channelId: 2, messageId: 3, status: 1, success: false, result: null });
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await repo.update('histories', 1, { success: true });
    expect(pool.query.mock.lastCall?.[1]).toEqual([true, 1]);
    pool.query.mockResolvedValueOnce([[['4']], []]);
    pool.query.mockResolvedValueOnce([[], []]);
    const page = await repo.page('users', { lastForgetTime: null }, 2, 2);
    expect(page).toEqual({ items: [], page: 2, pageSize: 2, total: 4 });
    expect(pool.query.mock.lastCall?.[0].sql).toContain('`User`.`LastForgetTime` is null');
    expect(pool.query.mock.lastCall?.[1]).toEqual([2, 2]);
  } finally { await repo.close(); }
});
