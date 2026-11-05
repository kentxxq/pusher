import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Sqlite from 'better-sqlite3';
import { createConnection, type RowDataPacket } from 'mysql2/promise';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { getTableName } from 'drizzle-orm';
import { convertLegacyProxies, proxyMigrationMarker, proxyMigrationUpdate, proxyMigrationValues } from './proxy-migration';
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
interface SnapshotColumn { name: string; type: string; primaryKey: boolean; notNull: boolean; autoincrement?: boolean; default?: unknown }
function baselineTables(directory: string) {
  const snapshot = JSON.parse(readFileSync(resolve(directory, 'meta/0000_snapshot.json'), 'utf8')) as { tables: Record<string, { name: string; columns: Record<string, SnapshotColumn>; compositePrimaryKeys?: Record<string, { columns: string[] }> }> };
  return Object.values(snapshot.tables).map(table => ({ name: table.name, columns: Object.values(table.columns).map(column => ({ ...column, primaryKey: column.primaryKey || Object.values(table.compositePrimaryKeys ?? {}).some(key => key.columns.includes(column.name)) })) }));
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
        for (const table of baselineTables(migrationsFolder)) {
          const actual = file.prepare(`PRAGMA table_info("${table.name}")`).all() as { name: string; type: string; pk: number; notnull: number }[];
          const expected = table.columns;
          if (actual.length !== expected.length || expected.some(c => { const a = actual.find(a => a.name === c.name); return !a || a.type.toLowerCase() !== c.type.toLowerCase() || Boolean(a.pk) !== c.primaryKey || (c.notNull && !a.notnull && !a.pk); })) throw new SetupError(`表 ${table.name} 与初始结构不匹配，请先核对旧库结构`);
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
      file.transaction(() => {
        file.exec('CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at NUMERIC)');
        for (const migration of migrations.slice(mode === 'reset' ? 0 : history.length)) {
          for (const statement of migration.sql) {
            if (!statement.trim()) continue;
            if (statement.trim() === proxyMigrationMarker) {
              const rows = file.prepare('SELECT Id AS id, ChannelProxyUrl AS proxy FROM Channel').all() as Array<{ id: number; proxy: string | null }>;
              const converted = convertLegacyProxies(rows);
              const update = file.prepare(proxyMigrationUpdate);
              for (const row of converted) update.run(...proxyMigrationValues(row.settings), row.id);
            } else file.exec(statement);
          }
          file.prepare('INSERT INTO __drizzle_migrations(hash, created_at) VALUES (?, ?)').run(migration.hash, migration.folderMillis);
        }
      })();
    } finally { file.close(); }
    return;
  }
  const connection = await createConnection({ uri: config.url, timezone: '+08:00', dateStrings: true });
  const lockName = `pusher:migrate:${new URL(config.url).pathname}`.slice(0, 64);
  try {
    const [lock] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 30) AS acquired', [lockName]);
    if (Number(lock[0]?.acquired) !== 1) throw new SetupError('无法获取数据库迁移锁');
    const [settings] = await connection.query<RowDataPacket[]>('SELECT @@lower_case_table_names AS value');
    const tableKey = (name: string) => Number(settings[0]?.value) === 0 ? name : name.toLowerCase();
    const [tables] = await connection.query<RowDataPacket[]>('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    const names = Object.values(mysql).map(table => tableKey(getTableName(table)));
    const hasHistory = tables.some(t => tableKey(t.name) === '__drizzle_migrations');
    const history = hasHistory ? (await connection.query<RowDataPacket[]>('SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at'))[0] as unknown as History[] : [];
    if (mode === 'reset') {
      for (const name of [...Object.values(mysql).map(getTableName), '__drizzle_migrations']) await connection.query(`DROP TABLE IF EXISTS \`${name}\``);
    } else if (mode === 'baseline') {
      if (history.length) throw new SetupError('该数据库已有迁移记录');
      for (const table of baselineTables(migrationsFolder)) {
        const actualTableName = tables.find(t => tableKey(t.name) === tableKey(table.name))?.name ?? table.name;
        const [actual] = await connection.query<RowDataPacket[]>('SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, COLUMN_KEY AS pk, IS_NULLABLE AS nullable, EXTRA AS extra, COLUMN_DEFAULT AS defaultValue FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND BINARY TABLE_NAME = BINARY ?', [actualTableName]);
        const expected = table.columns;
        const normalize = (value: string) => value.toLowerCase().replace(/int\(\d+\)/g, 'int').replace('boolean', 'tinyint');
        if (actual.length !== expected.length || expected.some(c => {
          const a = actual.find(a => a.name === c.name);
          const expectedDefault = c.default == null ? null : String(typeof c.default === 'boolean' ? Number(c.default) : c.default);
          const actualDefault = a?.defaultValue == null ? null : String(a.defaultValue);
          return !a || normalize(a.type) !== normalize(c.type) || (c.primaryKey !== (a.pk === 'PRI')) || (c.notNull !== (a.nullable === 'NO')) || (c.primaryKey && !String(a.extra).includes('auto_increment')) || actualDefault !== expectedDefault;
        })) throw new SetupError(`表 ${table.name} 与初始结构不匹配，请先核对旧库字段类型、精度与默认值`);
      }
      await connection.query('CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at BIGINT)');
      await connection.query('INSERT INTO __drizzle_migrations(hash, created_at) VALUES (?, ?)', [migrations[0]!.hash, migrations[0]!.folderMillis]);
      return;
    } else {
      if (!history.length && tables.some(t => names.includes(tableKey(t.name)))) throw new SetupError('检测到旧业务表，请先备份并执行 db:baseline');
      verifyHistory(history, migrations);
    }
    await connection.query('CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at BIGINT)');
    for (const migration of migrations.slice(mode === 'reset' ? 0 : history.length)) {
      await connection.beginTransaction();
      try {
        for (const statement of migration.sql) {
          if (!statement.trim()) continue;
          if (statement.trim() === proxyMigrationMarker) {
            const [rows] = await connection.query<RowDataPacket[]>('SELECT Id AS id, ChannelProxyUrl AS proxy FROM Channel');
            const converted = convertLegacyProxies(rows as Array<{ id: number; proxy: string | null }>);
            for (const row of converted) await connection.query(proxyMigrationUpdate, [...proxyMigrationValues(row.settings), row.id]);
          } else await connection.query(statement);
        }
        await connection.query('INSERT INTO __drizzle_migrations(hash, created_at) VALUES (?, ?)', [migration.hash, migration.folderMillis]);
        await connection.commit();
      } catch (error) { await connection.rollback(); throw error; }
    }
  } finally {
    await connection.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
    await connection.end();
  }
}
