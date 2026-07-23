import assert from 'node:assert/strict';

import { config } from 'dotenv';
import { and, eq, inArray } from 'drizzle-orm';

import {
  artists,
  artistSnapshots,
  getDb,
  getRankedArtistsAt,
  upsertArtistsAndSnapshot,
} from '@spotify-stats/db';

config({ path: '.env' });

type ArtistInput = {
  id: string;
  name: string;
  href: string;
  genres: string[];
  popularity: number;
};

const TEST_ID_A = `codex-artist-a-${Date.now()}`;
const TEST_ID_B = `codex-artist-b-${Date.now()}`;
const TEST_IDS = [TEST_ID_A, TEST_ID_B] as const;

const initialCapturedAt = new Date('2026-07-23T00:00:00.000Z');
const updatedCapturedAt = new Date('2026-07-23T01:00:00.000Z');

const initialArtists: ArtistInput[] = [
  {
    id: TEST_IDS[0],
    name: 'Codex Alpha',
    href: `https://open.spotify.com/artist/${TEST_ID_A}`,
    genres: ['indie'],
    popularity: 10,
  },
  {
    id: TEST_IDS[1],
    name: 'Codex Beta',
    href: `https://open.spotify.com/artist/${TEST_ID_B}`,
    genres: ['rock'],
    popularity: 80,
  },
];

const updatedArtists: ArtistInput[] = [
  {
    id: TEST_IDS[1],
    name: 'Codex Beta v2',
    href: `https://open.spotify.com/artist/${TEST_ID_B}?v=2`,
    genres: ['rock', 'alt'],
    popularity: 90,
  },
  {
    id: TEST_IDS[0],
    name: 'Codex Alpha v2',
    href: `https://open.spotify.com/artist/${TEST_ID_A}?v=2`,
    genres: ['indie', 'pop'],
    popularity: 20,
  },
];

async function countSnapshots(capturedAt: Date) {
  const db = getDb();
  const rows = await db
    .select({ artistId: artistSnapshots.artistId })
    .from(artistSnapshots)
    .where(and(inArray(artistSnapshots.artistId, TEST_IDS), eq(artistSnapshots.capturedAt, capturedAt)));

  return rows.length;
}

async function cleanup() {
  const db = getDb();
  await db.delete(artists).where(inArray(artists.id, TEST_IDS));
}

async function main() {
  const db = getDb();

  try {
    await cleanup();

    await upsertArtistsAndSnapshot(initialArtists, initialCapturedAt);
    await upsertArtistsAndSnapshot(initialArtists, initialCapturedAt);

    assert.equal(await countSnapshots(initialCapturedAt), 2);

    const initialRows = await db
      .select()
      .from(artists)
      .where(inArray(artists.id, TEST_IDS));

    assert.equal(initialRows.length, 2);

    const firstArtistBefore = initialRows.find((row) => row.id === TEST_IDS[0]);
    const secondArtistBefore = initialRows.find((row) => row.id === TEST_IDS[1]);
    assert.ok(firstArtistBefore);
    assert.ok(secondArtistBefore);

    await upsertArtistsAndSnapshot(updatedArtists, updatedCapturedAt);

    assert.equal(await countSnapshots(updatedCapturedAt), 2);

    const ranked = await getRankedArtistsAt(updatedCapturedAt);
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0]?.id, TEST_IDS[1]);
    assert.equal(ranked[1]?.id, TEST_IDS[0]);
    assert.equal(ranked[0]?.popularity, 90);
    assert.equal(ranked[1]?.popularity, 20);

    const updatedRows = await db
      .select()
      .from(artists)
      .where(inArray(artists.id, TEST_IDS));

    const firstArtistAfter = updatedRows.find((row) => row.id === TEST_IDS[0]);
    const secondArtistAfter = updatedRows.find((row) => row.id === TEST_IDS[1]);
    assert.ok(firstArtistAfter);
    assert.ok(secondArtistAfter);

    assert.equal(firstArtistAfter?.firstSeenAt.getTime(), firstArtistBefore.firstSeenAt.getTime());
    assert.equal(secondArtistAfter?.firstSeenAt.getTime(), secondArtistBefore.firstSeenAt.getTime());
    assert.equal(firstArtistAfter?.lastSeenAt.getTime(), updatedCapturedAt.getTime());
    assert.equal(secondArtistAfter?.lastSeenAt.getTime(), updatedCapturedAt.getTime());

    console.log('DB ingest integration test passed');
  } finally {
    await cleanup();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
