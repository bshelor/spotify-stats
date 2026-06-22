import { and, asc, desc, eq, gte, ilike, lte, sql, type SQL } from 'drizzle-orm';

import { getDb } from './client';
import { artists, artistSnapshots, type NewArtist } from './schema';

export type LeaderboardSort = 'rank' | 'popularity' | 'name';
export type LeaderboardDir = 'asc' | 'desc';

export type LeaderboardFilters = {
  q?: string;
  popMin?: number;
  popMax?: number;
  rankMin?: number;
  rankMax?: number;
  genre?: string;
};

export type LeaderboardParams = {
  capturedAt: Date;
  filters?: LeaderboardFilters;
  sort?: LeaderboardSort;
  dir?: LeaderboardDir;
  limit?: number;
  offset?: number;
};

function buildLeaderboardConditions(
  capturedAt: Date,
  filters: LeaderboardFilters = {},
): SQL[] {
  const conditions: SQL[] = [eq(artistSnapshots.capturedAt, capturedAt)];

  const q = filters.q?.trim();
  if (q) conditions.push(ilike(artists.name, `%${q}%`));

  if (filters.popMin !== undefined) conditions.push(gte(artistSnapshots.popularity, filters.popMin));
  if (filters.popMax !== undefined) conditions.push(lte(artistSnapshots.popularity, filters.popMax));

  if (filters.rankMin !== undefined) conditions.push(gte(artistSnapshots.rank, filters.rankMin));
  if (filters.rankMax !== undefined) conditions.push(lte(artistSnapshots.rank, filters.rankMax));

  const genre = filters.genre?.trim();
  if (genre) conditions.push(sql`${genre} = ANY(${artists.genres})`);

  return conditions;
}

export async function getLeaderboard({
  capturedAt,
  filters = {},
  sort = 'rank',
  dir = 'asc',
  limit = 100,
  offset = 0,
}: LeaderboardParams) {
  const db = getDb();

  const sortColumn =
    sort === 'popularity'
      ? artistSnapshots.popularity
      : sort === 'name'
        ? artists.name
        : artistSnapshots.rank;

  const orderBy = dir === 'desc' ? desc(sortColumn) : asc(sortColumn);

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
    .where(and(...buildLeaderboardConditions(capturedAt, filters)))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);
}

export async function getLeaderboardCount({
  capturedAt,
  filters = {},
}: Pick<LeaderboardParams, 'capturedAt' | 'filters'>) {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(artistSnapshots)
    .innerJoin(artists, eq(artists.id, artistSnapshots.artistId))
    .where(and(...buildLeaderboardConditions(capturedAt, filters)));
  return row?.count ?? 0;
}

export type RankedArtistInput = {
  id: string;
  name: string;
  href: string;
  genres: string[];
  popularity: number;
};

export async function getLatestCapturedAt() {
  const db = getDb();
  const [row] = await db
    .select({ capturedAt: artistSnapshots.capturedAt })
    .from(artistSnapshots)
    .orderBy(desc(artistSnapshots.capturedAt))
    .limit(1);
  if (!row) return null;
  return row.capturedAt instanceof Date ? row.capturedAt : new Date(row.capturedAt);
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
  if (rankedArtists.length === 0) return;
  const db = getDb();

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
    await db.insert(artistSnapshots).values(chunk).onConflictDoNothing();
  }
}

export async function getCaptureDates(limit = 20) {
  const db = getDb();
  const rows = await db
    .selectDistinct({ capturedAt: artistSnapshots.capturedAt })
    .from(artistSnapshots)
    .orderBy(desc(artistSnapshots.capturedAt))
    .limit(limit);
  return rows.map((r) => (r.capturedAt instanceof Date ? r.capturedAt : new Date(r.capturedAt)));
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
