import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

import * as schema from './schema';

export type DB = NeonHttpDatabase<typeof schema>;

let cached: DB | undefined;

export function getDb(connectionString?: string): DB {
  if (cached) return cached;
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  const sql = neon(url);
  cached = drizzle(sql, { schema });
  return cached;
}
