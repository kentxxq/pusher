import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Sqlite from 'better-sqlite3';
import { createConnection, type RowDataPacket } from 'mysql2/promise';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import { drizzle as sqliteDrizzle } from 'drizzle-orm/better-sqlite3';
import { migrate as mysqlMigrate } from 'drizzle-orm/mysql2/migrator';
import { migrate as sqliteMigrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { databaseConfig } from '../config';
import { SetupError } from '../errors';
import * as mysql from './mysql';
import * as sqlite from './sqlite';

type History = { hash: string; created_at: number | string };
function verifyHistory(history: History[], migrations: ReturnType<typeof readMigrationFiles>) {
  for (let i = 0; i < history.length; i++) {
    const row = history[i], expected = migrations[i];
    if (!expected || row.hash !== expected.hash || Number(row.created_at) !== expected.folderMillis) throw new SetupError('迁移历史与 SQL 不一致，禁止继续执行');
  }
}
export async function migrateDatabase(mode: 'migrate' | 'baseline' | 'reset' = 'migrate', config = databaseConfig(), migrationsFolder = resolve('db/migrations', config.dialect)) {
  const migrations = readMigrationFiles({ migrationsFolder });
  if (!migrations.length) throw new SetupError('缺少数据库迁移文件');
  if (config.dialect === 'sqlite') {
    if (config.path !== ':memory:') mkdirSync(dirname(config.path), { recursive: true });
    const file = new Sqlite(config.path);
    try {
      const names: string[] = Object.values(sqlite).map(getTableName);
      const tables = file.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      const hasHistory = tables.some(t => t.name === '__drizzle_migrations');
      const history = hasHistory ? file.prepare('SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at').all() as History[] : [];
      if (mode === 'reset') {
        file.transaction(() => { for (const name of [...names, '__drizzle_migrations']) file.exec(`DROP TABLE IF EXISTS "${name}"`); })();
      } else if (mode === 'baseline') {
        if (history.length) throw new SetupError('该数据库已有迁移记录');
        for (const table of Object.values(sqlite)) {
          const actual = file.prepare(`PRAGMA table_info("${getTableName(table)}")`).all() as { name: string; type: string; pk: number; notnull: number }[];
          const expected = Object.values(getTableColumns(table));
          if (actual.length !== expected.length || expected.some(c => { const a = actual.find(a => a.name === c.name); return !a || a.type.toLowerCase() !== c.getSQLType().toLowerCase() || Boolean(a.pk) !== c.primary || (c.notNull && !a.notnull && !a.pk); })) throw new SetupError(`表 ${getTableName(table)} 与初始结构不匹配，请先核对旧库结构`);
        }
        file.transaction(() => {
          file.exec('CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at NUMERIC)');
          file.prepare('INSERT INTO __drizzle_migrations(hash, created_at) VALUES (?, ?)').run(migrations[0]!.hash, migrations[0]!.folderMillis);
        })();
        return;
      } else {
        if (!history.length && tables.some(t => names.includes(t.name))) throw new SetupError('检测到旧业务表，请先备份并执行 db:baseline');
        verifyHistory(history, migrations);
      }
      sqliteMigrate(sqliteDrizzle(file), { migrationsFolder });
    } finally { file.close(); }
    return;
  }
  const connection = await createConnection({ uri: config.url, dateStrings: true });
  const lockName = `pusher:migrate:${new URL(config.url).pathname}`.slice(0, 64);
  try {
    const [lock] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 30) AS acquired', [lockName]);
    if (Number(lock[0]?.acquired) !== 1) throw new SetupError('无法获取数据库迁移锁');
    const [tables] = await connection.query<RowDataPacket[]>('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    const names = Object.values(mysql).map(getTableName);
    const hasHistory = tables.some(t => t.name === '__drizzle_migrations');
    const history = hasHistory ? (await connection.query<RowDataPacket[]>('SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at'))[0] as unknown as History[] : [];
    if (mode === 'reset') {
      for (const name of [...names, '__drizzle_migrations']) await connection.query(`DROP TABLE IF EXISTS \`${name}\``);
    } else if (mode === 'baseline') {
      if (history.length) throw new SetupError('该数据库已有迁移记录');
      for (const table of Object.values(mysql)) {
        const [actual] = await connection.query<RowDataPacket[]>('SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, COLUMN_KEY AS pk, IS_NULLABLE AS nullable, EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [getTableName(table)]);
        const expected = Object.values(getTableColumns(table));
        const normalize = (value: string) => value.toLowerCase().replace(/int\(\d+\)/g, 'int').replace('boolean', 'tinyint');
        if (actual.length !== expected.length || expected.some(c => { const a = actual.find(a => a.name === c.name); return !a || normalize(a.type) !== normalize(c.getSQLType()) || (c.primary && a.pk !== 'PRI') || (c.notNull && a.nullable !== 'NO') || (c.primary && !String(a.extra).includes('auto_increment')); })) throw new SetupError(`表 ${getTableName(table)} 与初始结构不匹配，请先核对旧库字段类型、精度与默认值`);
      }
      await connection.query('CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at BIGINT)');
      await connection.query('INSERT INTO __drizzle_migrations(hash, created_at) VALUES (?, ?)', [migrations[0]!.hash, migrations[0]!.folderMillis]);
      return;
    } else {
      if (!history.length && tables.some(t => names.includes(t.name))) throw new SetupError('检测到旧业务表，请先备份并执行 db:baseline');
      verifyHistory(history, migrations);
    }
    await mysqlMigrate(mysqlDrizzle(connection), { migrationsFolder });
  } finally {
    await connection.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
    await connection.end();
  }
}
