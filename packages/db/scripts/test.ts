import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb } from '../src/client';

const container = await new PostgreSqlContainer('postgres:17.6-alpine')
  .withDatabase('spotify_stats_test').start();
try {
  const url = container.getConnectionUri();
  const { db, close } = createDb(url);
  const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
  try {
    // Exercise the real upgrade path, including the external-ID data backfill.
    const initial = await readFile(`${migrationsFolder}/0000_init.sql`, 'utf8');
    await db.$client.query(initial.replaceAll('--> statement-breakpoint', ''));
    await db.$client.query(`INSERT INTO artists (id, name, href) VALUES ('legacy', 'Legacy', 'https://example.com')`);
    await db.$client.query(`INSERT INTO artist_snapshots (artist_id, captured_at, popularity, rank)
      VALUES ('legacy', '2026-01-01T00:00:00Z', 42, 1)`);
    const upgrade = await readFile(`${migrationsFolder}/0001_numerous_deadpool.sql`, 'utf8');
    await db.$client.query(upgrade.replaceAll('--> statement-breakpoint', ''));
    const external = await db.$client.query('SELECT provider, external_id FROM artist_external_ids');
    assert.deepEqual(external.rows, [{ provider: 'spotify', external_id: 'legacy' }]);
    const snapshots = await db.$client.query('SELECT provider, popularity FROM artist_snapshots');
    assert.deepEqual(snapshots.rows, [{ provider: 'spotify', popularity: 42 }]);
    // Then prove a clean install and repeat migration are both supported.
    await db.$client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    await migrate(db, { migrationsFolder });
    await migrate(db, { migrationsFolder });
  } finally {
    await close();
  }
  const result = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '../../apps/ingest/src/db-ingest.test.ts'], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: url, DB_TEST_RUNNER: 'isolated' },
    });
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.equal(result, 0, 'DB ingest integration test failed');
  console.log('Migration and DB integration tests passed');
} finally {
  await container.stop();
}
