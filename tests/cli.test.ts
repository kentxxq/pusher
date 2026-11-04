import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import Sqlite from 'better-sqlite3';

const vp = process.platform === 'win32' ? 'vp.exe' : 'vp';
describe('环境文件和发布入口', () => {
  it('从 .env 加载，现有环境变量优先', () => {
    const directory = resolve(`debug/tmpfile-AI-config-${randomUUID()}`);
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, '.env'), 'DB_DIALECT=sqlite\nSQLITE_PATH=./from-file.sqlite\n');
    const script = `import { databaseConfig } from ${JSON.stringify(pathToFileURL(resolve('server/config.ts')).href)}; console.log(JSON.stringify(databaseConfig()));`;
    const env = { ...process.env }; delete env.DB_DIALECT; delete env.SQLITE_PATH;
    const fromFile = spawnSync(vp, ['node', '--import', 'tsx', '--input-type=module', '-e', script], { cwd: directory, env, encoding: 'utf8', timeout: 15000 });
    expect(fromFile.status, fromFile.stderr).toBe(0);
    expect(fromFile.stdout).toContain('from-file.sqlite');
    const fromEnv = spawnSync(vp, ['node', '--import', 'tsx', '--input-type=module', '-e', script], { cwd: directory, env: { ...env, SQLITE_PATH: './from-env.sqlite' }, encoding: 'utf8', timeout: 15000 });
    expect(fromEnv.status, fromEnv.stderr).toBe(0);
    expect(fromEnv.stdout).toContain('from-env.sqlite'); expect(fromEnv.stdout).not.toContain('from-file.sqlite');
  });
  it('旧库未建立基线时启动失败，已有数据不受影响', () => {
    mkdirSync('debug', { recursive: true });
    const path = resolve(`debug/tmpfile-AI-start-${randomUUID()}.sqlite`);
    const db = new Sqlite(path); db.exec('CREATE TABLE Room(Id INTEGER PRIMARY KEY, RoomName TEXT); INSERT INTO Room VALUES(1, \'保留原数据\');'); db.close();
    const result = spawnSync(vp, ['run', 'start'], { encoding: 'utf8', timeout: 15000, env: { ...process.env, DB_DIALECT: 'sqlite', SQLITE_PATH: path, JWT_KEY: Buffer.alloc(32, 7).toString('base64'), JWT_ISSUER: 'fake_info', JWT_AUDIENCE: 'fake_info', JWT_EXPIRE_DAYS: '1', APP_URL: 'http://localhost' } });
    expect(result.status).toBe(1); expect(result.error).toBeUndefined();
    expect(result.stderr).toContain('启动失败，阶段：数据库迁移');
    expect(result.stderr).toContain('检测到旧业务表');
    expect(result.stdout).not.toContain('Pusher 已启动');
    const raw = new Sqlite(path); try { expect(raw.prepare('SELECT RoomName FROM Room').get()).toEqual({ RoomName: '保留原数据' }); } finally { raw.close(); }
  });
});
