import { expect, it } from 'vitest';
import { MySqlDialect } from 'drizzle-orm/mysql-core';
import { createStatisticsReader } from '../server/db/statistics';
import * as tables from '../server/db/mysql';

it('MySQL 日期分组按聚合结果排序，兼容 ONLY_FULL_GROUP_BY', async () => {
  const dialect = new MySqlDialect();
  const queries: string[] = [];
  const read = createStatisticsReader(tables, async query => {
    const { sql } = dialect.sqlToQuery(query);
    queries.push(sql);
    return [{ name: '2026-10-21', count: 1 }];
  }, 'mysql');
  await read('2026-10-20 12:00:00.000', 1);
  const daily = queries.find(query => query.includes('substr('))!;
  expect(daily).toContain('group by binary substr(`Message`.`RecordTime`, 1, 10)');
  expect(daily).toContain('order by min(substr(`Message`.`RecordTime`, 1, 10)) asc');
  for (const query of queries.filter(query => query.includes('group by'))) {
    expect(query).toMatch(/order by (min|max)\(/);
  }
});
