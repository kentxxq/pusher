import { afterEach, expect, it, vi } from 'vitest';
import { perform } from '../server/http';
import { BusinessError } from '../shared/domain';

afterEach(() => vi.restoreAllMocks());

it('保留通用页面错误，并仅记录 Drizzle 包装的驱动代码', async () => {
  const output = vi.spyOn(console, 'error').mockImplementation(() => {});
  const cause = Object.assign(new Error('fake_password'), { code: 'ER_BAD_FIELD_ERROR', errno: 1054, sqlState: '42S22', sql: 'fake_secret' });
  await expect(perform(async () => { throw new Error('fake_url', { cause }); })).rejects.toThrow('操作失败，请检查服务器配置或数据库状态');
  expect(output).toHaveBeenCalledWith('[pusher] 服务端操作失败', { code: 'ER_BAD_FIELD_ERROR', errno: 1054, sqlState: '42S22' });
  expect(JSON.stringify(output.mock.calls)).not.toMatch(/fake_password|fake_secret|fake_url/);
});

it('业务错误不记录为未知异常，没有合法代码的异常也不打印原始内容', async () => {
  const output = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(perform(async () => { throw new BusinessError('记录不存在', 404); })).rejects.toThrow('记录不存在');
  expect(output).not.toHaveBeenCalled();
  await expect(perform(async () => { throw Object.assign(new Error('fake_password'), { code: 'mysql://fake_user:fake_password@REPLACE_ME', sqlState: 'fake_secret' }); })).rejects.toThrow();
  expect(output).toHaveBeenCalledWith('[pusher] 服务端操作失败', { code: 'UNKNOWN' });
});
