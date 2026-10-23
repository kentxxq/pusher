import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';
import { SetupError } from './errors';

loadDotenv({ path: resolve(process.cwd(), '.env'), quiet: true });

export function databaseConfig(env: NodeJS.ProcessEnv = process.env) {
  const dialect = z.enum(['mysql', 'sqlite']).default('mysql').parse(env.DB_DIALECT);
  if (dialect === 'sqlite') {
    const path = z.string().min(1).default('./data/pusher.sqlite').parse(env.SQLITE_PATH);
    return { dialect, path: path === ':memory:' ? path : resolve(process.cwd(), path) } as const;
  }
  const url = env.DATABASE_URL;
  if (!url || !URL.canParse(url) || new URL(url).protocol !== 'mysql:' || !new URL(url).pathname.slice(1)) {
    throw new SetupError('请在 .env 中配置有效的 MySQL DATABASE_URL');
  }
  return { dialect, url } as const;
}

export function appConfig() {
  const key = Buffer.from(process.env.JWT_KEY || '', 'base64');
  if (key.length < 32) throw new SetupError('JWT_KEY 必须是至少 32 字节的 Base64 密钥');
  return {
    key,
    issuer: z.string().min(1).parse(process.env.JWT_ISSUER),
    audience: z.string().min(1).parse(process.env.JWT_AUDIENCE),
    days: z.coerce.number().int().positive().default(1).parse(process.env.JWT_EXPIRE_DAYS),
    origin: new URL(process.env.APP_URL || 'http://localhost:3000').origin,
  };
}
