import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

export function createDb(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

export type DB = ReturnType<typeof createDb>['db'];
let cached: ReturnType<typeof createDb> | undefined;
let cachedUrl: string | undefined;

export function getDb(connectionString?: string): DB {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  if (cached && cachedUrl !== url) {
    throw new Error('Database URL changed; close the existing connection before switching databases');
  }
  if (!cached) {
    cached = createDb(url);
    cachedUrl = url;
  }
  return cached.db;
}

export async function closeDb() {
  await cached?.close();
  cached = undefined;
  cachedUrl = undefined;
}
