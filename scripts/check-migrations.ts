import { cpSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

function manifest(directory: string): string {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).map(entry => {
    const path = join(directory, entry.name);
    return entry.name + ':' + (entry.isDirectory() ? manifest(path) : createHash('sha256').update(readFileSync(path)).digest('hex'));
  }).join('\n');
}
const scratch = resolve(`debug/tmpfile-AI-migration-check-${randomUUID()}`);
mkdirSync(scratch, { recursive: true });
for (const dialect of ['mysql', 'sqlite']) {
  const out = join(scratch, dialect);
  cpSync(resolve('db/migrations', dialect), out, { recursive: true });
  const before = manifest(out);
  const config = join(scratch, `tmpfile-AI-${dialect}.config.ts`);
  writeFileSync(config, `import { defineConfig } from 'drizzle-kit';\nexport default defineConfig(${JSON.stringify({ dialect, schema: resolve('server/db', `${dialect}.ts`).replaceAll('\\', '/'), out: out.replaceAll('\\', '/') })});\n`);
  const result = spawnSync(process.platform === 'win32' ? 'vp.exe' : 'vp', ['exec', 'drizzle-kit', 'generate', '--config', config], { encoding: 'utf8', timeout: 60000, input: '' });
  if (result.status !== 0 || before !== manifest(out)) {
    console.error(`${dialect} schema 或迁移快照有变更，请执行 vpr db:generate 并审阅 SQL`);
    process.exitCode = 1;
  } else console.log(`${dialect} schema 与迁移快照一致`);
}
