import { pgTable, text, timestamp, integer, primaryKey, index } from 'drizzle-orm/pg-core';

export const musicProvider = {
  spotify: 'spotify',
} as const;

export type MusicProvider = (typeof musicProvider)[keyof typeof musicProvider];

export const artists = pgTable('artists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  href: text('href').notNull(),
  genres: text('genres').array().notNull().default([]),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const artistExternalIds = pgTable(
  'artist_external_ids',
  {
    artistId: text('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    href: text('href'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.externalId] }),
    byArtist: index('idx_artist_external_ids_artist').on(t.artistId),
  }),
);

export const ingestRuns = pgTable(
  'ingest_runs',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true, mode: 'date' }).notNull(),
    status: text('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'date' }),
    artistCount: integer('artist_count'),
    snapshotCount: integer('snapshot_count'),
    error: text('error'),
  },
  (t) => ({
    byProviderCaptured: index('idx_ingest_runs_provider_captured').on(t.provider, t.capturedAt.desc()),
    byStatus: index('idx_ingest_runs_status').on(t.status),
  }),
);

export const artistSnapshots = pgTable(
  'artist_snapshots',
  {
    artistId: text('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull().default(musicProvider.spotify),
    capturedAt: timestamp('captured_at', { withTimezone: true, mode: 'date' }).notNull(),
    ingestRunId: text('ingest_run_id').references(() => ingestRuns.id, { onDelete: 'set null' }),
    popularity: integer('popularity').notNull(),
    rank: integer('rank').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.artistId, t.provider, t.capturedAt] }),
    byCaptured: index('idx_snap_captured').on(t.provider, t.capturedAt.desc()),
    byCapturedRank: index('idx_snap_captured_rank').on(t.provider, t.capturedAt, t.rank),
    byRun: index('idx_snap_ingest_run').on(t.ingestRunId),
  }),
);

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
export type ArtistExternalId = typeof artistExternalIds.$inferSelect;
export type NewArtistExternalId = typeof artistExternalIds.$inferInsert;
export type IngestRun = typeof ingestRuns.$inferSelect;
export type NewIngestRun = typeof ingestRuns.$inferInsert;
export type ArtistSnapshot = typeof artistSnapshots.$inferSelect;
export type NewArtistSnapshot = typeof artistSnapshots.$inferInsert;
