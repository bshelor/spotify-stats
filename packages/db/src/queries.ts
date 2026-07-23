import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { getDb } from './client';
import { artists, artistSnapshots, type NewArtist } from './schema';

export type RankedArtistInput = {
  id: string;
  name: string;
  href: string;
  genres: string[];
  popularity: number;
};

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export async function getLatestCapturedAt() {
  const db = getDb();
  const [row] = await db
    .select({ capturedAt: sql<Date>`max(${artistSnapshots.capturedAt})` })
    .from(artistSnapshots);
  return asDate(row?.capturedAt);
}

export async function getTopArtistsAt(capturedAt: Date, limit = 10) {
  const db = getDb();
  return db
    .select({
      id: artists.id,
      name: artists.name,
      href: artists.href,
      genres: artists.genres,
      popularity: artistSnapshots.popularity,
      rank: artistSnapshots.rank,
    })
    .from(artistSnapshots)
    .innerJoin(artists, eq(artists.id, artistSnapshots.artistId))
    .where(eq(artistSnapshots.capturedAt, capturedAt))
    .orderBy(artistSnapshots.rank)
    .limit(limit);
}

export async function getRankedArtistsAt(capturedAt: Date) {
  const db = getDb();
  return db
    .select({
      id: artists.id,
      name: artists.name,
      href: artists.href,
      genres: artists.genres,
      popularity: artistSnapshots.popularity,
      rank: artistSnapshots.rank,
    })
    .from(artistSnapshots)
    .innerJoin(artists, eq(artists.id, artistSnapshots.artistId))
    .where(eq(artistSnapshots.capturedAt, capturedAt))
    .orderBy(artistSnapshots.rank);
}

export async function getArtistTimeSeries(artistId: string) {
  const db = getDb();
  return db
    .select({
      capturedAt: artistSnapshots.capturedAt,
      popularity: artistSnapshots.popularity,
      rank: artistSnapshots.rank,
    })
    .from(artistSnapshots)
    .where(eq(artistSnapshots.artistId, artistId))
    .orderBy(artistSnapshots.capturedAt);
}

export async function getArtistById(artistId: string) {
  const db = getDb();
  const [row] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
  return row ?? null;
}

export async function getAllArtistsAt(capturedAt: Date, limit = 200, offset = 0) {
  const db = getDb();
  return db
    .select({
      id: artists.id,
      name: artists.name,
      href: artists.href,
      genres: artists.genres,
      popularity: artistSnapshots.popularity,
      rank: artistSnapshots.rank,
    })
    .from(artistSnapshots)
    .innerJoin(artists, eq(artists.id, artistSnapshots.artistId))
    .where(eq(artistSnapshots.capturedAt, capturedAt))
    .orderBy(artistSnapshots.rank)
    .limit(limit)
    .offset(offset);
}

export async function getBiggestMovers(
  windowStart: Date,
  windowEnd: Date,
  limit = 10,
) {
  const db = getDb();
  const startRanks = db.$with('start_ranks').as(
    db
      .select({
        artistId: artistSnapshots.artistId,
        rank: artistSnapshots.rank,
      })
      .from(artistSnapshots)
      .where(eq(artistSnapshots.capturedAt, windowStart)),
  );
  const endRanks = db.$with('end_ranks').as(
    db
      .select({
        artistId: artistSnapshots.artistId,
        rank: artistSnapshots.rank,
        popularity: artistSnapshots.popularity,
      })
      .from(artistSnapshots)
      .where(eq(artistSnapshots.capturedAt, windowEnd)),
  );

  return db
    .with(startRanks, endRanks)
    .select({
      id: artists.id,
      name: artists.name,
      href: artists.href,
      previousRank: startRanks.rank,
      currentRank: endRanks.rank,
      currentPopularity: endRanks.popularity,
      delta: sql<number>`${startRanks.rank} - ${endRanks.rank}`.as('delta'),
    })
    .from(endRanks)
    .innerJoin(startRanks, eq(startRanks.artistId, endRanks.artistId))
    .innerJoin(artists, eq(artists.id, endRanks.artistId))
    .orderBy(desc(sql`${startRanks.rank} - ${endRanks.rank}`))
    .limit(limit);
}

export async function upsertArtistsAndSnapshot(
  rankedArtists: RankedArtistInput[],
  capturedAt: Date,
) {
  if (rankedArtists.length === 0) {
    console.log(`Skipping DB upsert for empty artist batch at ${capturedAt.toISOString()}`);
    return;
  }
  const db = getDb();

  console.log(
    `Upserting ${rankedArtists.length} artists and snapshots for ${capturedAt.toISOString()}`,
  );

  const artistRows: NewArtist[] = rankedArtists.map((a) => ({
    id: a.id,
    name: a.name,
    href: a.href,
    genres: a.genres,
    lastSeenAt: capturedAt,
  }));

  // Neon HTTP driver does not support multi-statement transactions, so run
  // these in sequence. Chunked to stay under the 65k parameter limit.
  const chunkSize = 500;
  for (let i = 0; i < artistRows.length; i += chunkSize) {
    const chunk = artistRows.slice(i, i + chunkSize);
    console.log(`Upserting artist chunk ${Math.floor(i / chunkSize) + 1} with ${chunk.length} rows`);
    await db
      .insert(artists)
      .values(chunk)
      .onConflictDoUpdate({
        target: artists.id,
        set: {
          name: sql`excluded.name`,
          href: sql`excluded.href`,
          genres: sql`excluded.genres`,
          lastSeenAt: sql`excluded.last_seen_at`,
        },
      });
  }

  const snapshotRows = rankedArtists.map((a, idx) => ({
    artistId: a.id,
    capturedAt,
    popularity: a.popularity,
    rank: idx + 1,
  }));

  for (let i = 0; i < snapshotRows.length; i += chunkSize) {
    const chunk = snapshotRows.slice(i, i + chunkSize);
    console.log(`Inserting snapshot chunk ${Math.floor(i / chunkSize) + 1} with ${chunk.length} rows`);
    await db.insert(artistSnapshots).values(chunk).onConflictDoNothing();
  }

  console.log(`Finished DB upsert for ${rankedArtists.length} artists`);
}

export async function getCaptureDates(limit = 20) {
  const db = getDb();
  const rows = await db
    .selectDistinct({ capturedAt: artistSnapshots.capturedAt })
    .from(artistSnapshots)
    .orderBy(desc(artistSnapshots.capturedAt))
    .limit(limit);
  return rows.map((r) => asDate(r.capturedAt)).filter((value): value is Date => value !== null);
}

export async function getSnapshotsBetween(artistId: string, from: Date, to: Date) {
  const db = getDb();
  return db
    .select()
    .from(artistSnapshots)
    .where(
      and(
        eq(artistSnapshots.artistId, artistId),
        gte(artistSnapshots.capturedAt, from),
        lte(artistSnapshots.capturedAt, to),
      ),
    )
    .orderBy(artistSnapshots.capturedAt);
}
