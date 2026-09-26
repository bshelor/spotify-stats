import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';

import { getDb } from './client';
import {
  artistExternalIds,
  artists,
  artistSnapshots,
  ingestRuns,
  musicProvider,
  type MusicProvider,
  type NewArtist,
  type NewArtistExternalId,
} from './schema';

export type RankedArtistInput = {
  id: string;
  name: string;
  href: string;
  genres: string[];
  popularity: number;
};

export type IngestRunStatus = 'running' | 'completed' | 'failed';

function escapeLikePattern(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export async function getLatestCapturedAt() {
  const db = getDb();
  const [row] = await db
    .select({ capturedAt: sql<Date>`max(${artistSnapshots.capturedAt})` })
    .from(artistSnapshots)
    .where(eq(artistSnapshots.provider, musicProvider.spotify));
  return asDate(row?.capturedAt);
}

export async function getTopArtistsAt(capturedAt: Date, limit = 10, provider: MusicProvider = musicProvider.spotify) {
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
    .where(and(eq(artistSnapshots.provider, provider), eq(artistSnapshots.capturedAt, capturedAt)))
    .orderBy(artistSnapshots.rank)
    .limit(limit);
}

export async function getRankedArtistsAt(capturedAt: Date, provider: MusicProvider = musicProvider.spotify) {
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
    .where(and(eq(artistSnapshots.provider, provider), eq(artistSnapshots.capturedAt, capturedAt)))
    .orderBy(artistSnapshots.rank);
}

export async function getArtistTimeSeries(artistId: string, provider: MusicProvider = musicProvider.spotify) {
  const db = getDb();
  return db
    .select({
      capturedAt: artistSnapshots.capturedAt,
      popularity: artistSnapshots.popularity,
      rank: artistSnapshots.rank,
    })
    .from(artistSnapshots)
    .where(and(eq(artistSnapshots.provider, provider), eq(artistSnapshots.artistId, artistId)))
    .orderBy(artistSnapshots.capturedAt);
}

export async function getArtistById(artistId: string) {
  const db = getDb();
  const [row] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
  return row ?? null;
}

export async function getAllArtistsAt(
  capturedAt: Date,
  limit = 200,
  offset = 0,
  search?: string,
  provider: MusicProvider = musicProvider.spotify,
) {
  const db = getDb();
  const trimmedSearch = search?.trim();
  const searchPattern = trimmedSearch ? `%${escapeLikePattern(trimmedSearch)}%` : undefined;
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
    .where(
      trimmedSearch && searchPattern
        ? and(
            eq(artistSnapshots.provider, provider),
            eq(artistSnapshots.capturedAt, capturedAt),
            or(
              ilike(artists.name, searchPattern),
              sql<boolean>`${artists.genres}::text ILIKE ${searchPattern} ESCAPE '\\'`,
            ),
          )
        : and(eq(artistSnapshots.provider, provider), eq(artistSnapshots.capturedAt, capturedAt)),
    )
    .orderBy(artistSnapshots.rank)
    .limit(limit)
    .offset(offset);
}

export async function getBiggestMovers(
  windowStart: Date,
  windowEnd: Date,
  limit = 10,
  provider: MusicProvider = musicProvider.spotify,
) {
  const db = getDb();
  const startRanks = db.$with('start_ranks').as(
    db
      .select({
        artistId: artistSnapshots.artistId,
        rank: artistSnapshots.rank,
      })
      .from(artistSnapshots)
      .where(and(eq(artistSnapshots.provider, provider), eq(artistSnapshots.capturedAt, windowStart))),
  );
  const endRanks = db.$with('end_ranks').as(
    db
      .select({
        artistId: artistSnapshots.artistId,
        rank: artistSnapshots.rank,
        popularity: artistSnapshots.popularity,
      })
      .from(artistSnapshots)
      .where(and(eq(artistSnapshots.provider, provider), eq(artistSnapshots.capturedAt, windowEnd))),
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
  options: {
    provider?: MusicProvider;
    ingestRunId?: string;
  } = {},
) {
  if (rankedArtists.length === 0) {
    console.log(`Skipping DB upsert for empty artist batch at ${capturedAt.toISOString()}`);
    return;
  }
  const db = getDb();
  const provider = options.provider ?? musicProvider.spotify;

  console.log(
    `Upserting ${rankedArtists.length} ${provider} artists and snapshots for ${capturedAt.toISOString()}`,
  );

  const artistRows: NewArtist[] = rankedArtists.map((a) => ({
    id: a.id,
    name: a.name,
    href: a.href,
    genres: a.genres,
    lastSeenAt: capturedAt,
  }));

  const externalIdRows: NewArtistExternalId[] = rankedArtists.map((a) => ({
    artistId: a.id,
    provider,
    externalId: a.id,
    href: a.href,
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

  for (let i = 0; i < externalIdRows.length; i += chunkSize) {
    const chunk = externalIdRows.slice(i, i + chunkSize);
    console.log(`Upserting external id chunk ${Math.floor(i / chunkSize) + 1} with ${chunk.length} rows`);
    await db
      .insert(artistExternalIds)
      .values(chunk)
      .onConflictDoUpdate({
        target: [artistExternalIds.provider, artistExternalIds.externalId],
        set: {
          artistId: sql`excluded.artist_id`,
          href: sql`excluded.href`,
          lastSeenAt: sql`excluded.last_seen_at`,
        },
      });
  }

  const snapshotRows = rankedArtists.map((a, idx) => ({
    artistId: a.id,
    provider,
    capturedAt,
    ingestRunId: options.ingestRunId,
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
    .where(eq(artistSnapshots.provider, musicProvider.spotify))
    .orderBy(desc(artistSnapshots.capturedAt))
    .limit(limit);
  return rows.map((r) => asDate(r.capturedAt)).filter((value): value is Date => value !== null);
}

export async function getSnapshotsBetween(
  artistId: string,
  from: Date,
  to: Date,
  provider: MusicProvider = musicProvider.spotify,
) {
  const db = getDb();
  return db
    .select()
    .from(artistSnapshots)
    .where(
      and(
        eq(artistSnapshots.provider, provider),
        eq(artistSnapshots.artistId, artistId),
        gte(artistSnapshots.capturedAt, from),
        lte(artistSnapshots.capturedAt, to),
      ),
    )
    .orderBy(artistSnapshots.capturedAt);
}

export async function createIngestRun(input: {
  id: string;
  provider?: MusicProvider;
  capturedAt: Date;
}) {
  const db = getDb();
  const provider = input.provider ?? musicProvider.spotify;
  const [row] = await db
    .insert(ingestRuns)
    .values({
      id: input.id,
      provider,
      capturedAt: input.capturedAt,
      status: 'running',
    })
    .onConflictDoUpdate({
      target: ingestRuns.id,
      set: {
        provider,
        capturedAt: input.capturedAt,
        status: 'running',
        startedAt: sql`now()`,
        finishedAt: null,
        artistCount: null,
        snapshotCount: null,
        error: null,
      },
    })
    .returning();

  return row;
}

export async function completeIngestRun(
  id: string,
  counts: {
    artistCount: number;
    snapshotCount: number;
  },
) {
  const db = getDb();
  await db
    .update(ingestRuns)
    .set({
      status: 'completed',
      finishedAt: new Date(),
      artistCount: counts.artistCount,
      snapshotCount: counts.snapshotCount,
      error: null,
    })
    .where(eq(ingestRuns.id, id));
}

export async function failIngestRun(id: string, error: unknown) {
  const db = getDb();
  await db
    .update(ingestRuns)
    .set({
      status: 'failed',
      finishedAt: new Date(),
      error: error instanceof Error ? error.message : String(error),
    })
    .where(eq(ingestRuns.id, id));
}
