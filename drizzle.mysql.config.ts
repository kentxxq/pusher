import { defineConfig } from 'drizzle-kit';
import './server/config';

export default defineConfig({ dialect: 'mysql', schema: './server/db/mysql.ts', out: './db/migrations/mysql' });

