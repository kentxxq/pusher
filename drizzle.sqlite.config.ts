import { defineConfig } from 'drizzle-kit';
import './server/config';

export default defineConfig({ dialect: 'sqlite', schema: './server/db/sqlite.ts', out: './db/migrations/sqlite' });

