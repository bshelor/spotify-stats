import { pgTable, text, timestamp, integer, primaryKey, index } from 'drizzle-orm/pg-core';

export const artists = pgTable('artists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  href: text('href').notNull(),
  genres: text('genres').array().notNull().default([]),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const artistSnapshots = pgTable(
  'artist_snapshots',
  {
    artistId: text('artist_id')
      .notNull()
      .references(() => artists.id, { onDelete: 'cascade' }),
    capturedAt: timestamp('captured_at', { withTimezone: true, mode: 'date' }).notNull(),
    popularity: integer('popularity').notNull(),
    rank: integer('rank').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.artistId, t.capturedAt] }),
    byCaptured: index('idx_snap_captured').on(t.capturedAt.desc()),
    byCapturedRank: index('idx_snap_captured_rank').on(t.capturedAt, t.rank),
  }),
);

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
export type ArtistSnapshot = typeof artistSnapshots.$inferSelect;
export type NewArtistSnapshot = typeof artistSnapshots.$inferInsert;
