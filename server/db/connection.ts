import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Sqlite from 'better-sqlite3';
import { createPool } from 'mysql2/promise';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import type { MySqlUpdateSetSource } from 'drizzle-orm/mysql-core';
import type { SQLiteUpdateSetSource } from 'drizzle-orm/sqlite-core';
import { and, count, desc, eq, getTableColumns, inArray, isNull, type SQL, type SQLWrapper } from 'drizzle-orm';
import { databaseConfig } from '../config';
import { Repository, type EntityRepository, type ListOptions } from './repository';
import type { TableName } from '../../shared/domain';
import * as mysql from './mysql';
import * as sqlite from './sqlite';
import { createStatisticsReader } from './statistics';

function conditions(columns: Record<string, SQLWrapper>, filter: object = {}): SQL | undefined {
  return and(...Object.entries(filter).map(([key, value]) => {
    const column = columns[key];
    if (!column) throw new Error('未知数据库字段');
    return value === null ? isNull(column) : Array.isArray(value) ? inArray(column, value) : eq(column, value);
  }));
}

function queryWindow<T extends { limit(value: number): unknown; offset(value: number): unknown }>(query: T, options: ListOptions) {
  if (options.limit !== undefined) query.limit(options.limit);
  if (options.offset !== undefined) query.offset(options.offset);
  return query;
}

export function openDatabase(config = databaseConfig()) {
  if (config.dialect === 'mysql') {
    const pool = createPool({ uri: config.url, timezone: '+08:00', dateStrings: true, connectionLimit: 5 });
    const db = mysqlDrizzle(pool);
    function tableRepository<T extends (typeof mysql)[TableName]>(table: T): EntityRepository<T['$inferSelect']> {
      const columns = getTableColumns(table);
      return {
        async list(filter = {}, options = {}) {
          return await queryWindow(db.select().from(table).where(conditions(columns, filter)).orderBy(desc(table.id)).$dynamic(), options) as T['$inferSelect'][];
        },
        async count(filter = {}) {
          const [result] = await db.select({ value: count() }).from(table).where(conditions(columns, filter));
          return Number(result!.value);
        },
        async insert(value) {
          const [result] = await db.insert(table).values(value as T['$inferInsert']);
          return result.insertId;
        },
        async update(id, value) { await db.update(table).set(value as MySqlUpdateSetSource<T>).where(eq(table.id, id)); },
        async remove(id) { await db.delete(table).where(eq(table.id, id)); },
      };
    }
    const tables = {
      users: tableRepository(mysql.users), rooms: tableRepository(mysql.rooms), channels: tableRepository(mysql.channels),
      templates: tableRepository(mysql.templates), messages: tableRepository(mysql.messages),
      histories: tableRepository(mysql.histories), relations: tableRepository(mysql.relations),
    };
    const statistics = createStatisticsReader(mysql, async query => {
      const [rows] = await db.execute(query);
      // Drizzle mysql2 的原始 execute 固定声明为 DDL 结果，此处只执行 SELECT。
      return rows as unknown as Record<string, unknown>[];
    }, 'mysql');
    return new Repository(tables, async () => { await pool.end(); }, statistics);
  }
  if (config.dialect === 'sqlite') {
    if (config.path !== ':memory:') mkdirSync(dirname(config.path), { recursive: true });
    const file = new Sqlite(config.path);
    file.pragma('journal_mode = WAL');
    file.pragma('foreign_keys = ON');
    file.pragma('busy_timeout = 5000');
    const db = sqliteDrizzle(file);
    function tableRepository<T extends (typeof sqlite)[TableName]>(table: T): EntityRepository<T['$inferSelect']> {
      const columns = getTableColumns(table);
      return {
        async list(filter = {}, options = {}) {
          return queryWindow(db.select().from(table).where(conditions(columns, filter)).orderBy(desc(table.id)).$dynamic(), options).all() as T['$inferSelect'][];
        },
        async count(filter = {}) { return db.select({ value: count() }).from(table).where(conditions(columns, filter)).get()!.value; },
        async insert(value) {
          const result = db.insert(table).values(value as T['$inferInsert']).run();
          return Number(result.lastInsertRowid);
        },
        async update(id, value) { db.update(table).set(value as SQLiteUpdateSetSource<T>).where(eq(table.id, id)).run(); },
        async remove(id) { db.delete(table).where(eq(table.id, id)).run(); },
      };
    }
    const tables = {
      users: tableRepository(sqlite.users), rooms: tableRepository(sqlite.rooms), channels: tableRepository(sqlite.channels),
      templates: tableRepository(sqlite.templates), messages: tableRepository(sqlite.messages),
      histories: tableRepository(sqlite.histories), relations: tableRepository(sqlite.relations),
    };
    const statistics = createStatisticsReader(sqlite, async query => db.all<Record<string, unknown>>(query), 'sqlite');
    return new Repository(tables, async () => { file.close(); }, statistics);
  }
  throw new Error('不支持的数据库类型');
}
