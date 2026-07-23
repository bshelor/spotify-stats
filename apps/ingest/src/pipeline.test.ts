import assert from 'node:assert/strict';

import { runFetchPipeline, rankArtistsForPersist } from './pipeline.js';
import type { SpotifyArtist } from './services/spotify.js';
import type { Artist } from './rankArtists.js';

const mockedA = {
  id: 'artist-a',
  name: 'Artist A',
  popularity: 12,
  genres: ['indie'],
  href: 'https://open.spotify.com/artist/artist-a',
} satisfies SpotifyArtist;

const mockedB = {
  id: 'artist-b',
  name: 'Artist B',
  popularity: 87,
  genres: ['rock'],
  href: 'https://open.spotify.com/artist/artist-b',
} satisfies SpotifyArtist;

const mockedC = {
  id: 'artist-c',
  name: 'Artist C',
  popularity: 55,
  genres: ['pop'],
  href: 'https://open.spotify.com/artist/artist-c',
} satisfies SpotifyArtist;

async function main() {
  const fetchCalls: Array<{ query: string; options?: { offset?: number; nextUrl?: string; limit?: number } }> = [];
  const persistCalls: Array<{ artists: Artist[]; capturedAt: Date }> = [];

  const fetchArtists = async (
    query: string,
    options?: { offset?: number; nextUrl?: string; limit?: number },
  ) => {
    fetchCalls.push({ query, options });

    if (query === 'z' && options?.nextUrl === undefined) {
      return { artists: [mockedA, mockedB], total: 2, limit: 10, offset: 0, nextUrl: null };
    }

    if (query === 'a' && options?.offset === 0) {
      return { artists: [mockedB, mockedC], total: 2, limit: 10, offset: 0, nextUrl: null };
    }

    if (query === 'b' && options?.offset === 0) {
      return { artists: [], total: 0, limit: 10, offset: 0, nextUrl: null };
    }

    return { artists: [], total: 0, limit: 10, offset: options?.offset ?? 0, nextUrl: null };
  };

  const persistArtists = async (artists: Artist[], capturedAt: Date) => {
    persistCalls.push({ artists, capturedAt });
  };

  const { capturedAt, rankedArtists } = await runFetchPipeline(
    fetchArtists,
    persistArtists,
    ['z'],
    ['a', 'b'],
  );

  assert.equal(fetchCalls.length, 3);
  assert.deepEqual(fetchCalls, [
    { query: 'z', options: { limit: 50 } },
    { query: 'a', options: { offset: 0 } },
    { query: 'b', options: { offset: 0 } },
  ]);

  assert.equal(persistCalls.length, 1);
  assert.equal(persistCalls[0]?.capturedAt.getTime(), capturedAt.getTime());
  assert.deepEqual(
    persistCalls[0]?.artists.map((artist) => artist.id),
    ['artist-b', 'artist-c', 'artist-a'],
  );

  assert.deepEqual(
    rankedArtists.map((artist) => artist.id),
    ['artist-b', 'artist-c', 'artist-a'],
  );

  assert.deepEqual(
    rankArtistsForPersist([
      { id: 'x', name: 'X', popularity: 1, genres: [], href: 'x' },
      { id: 'y', name: 'Y', popularity: 3, genres: [], href: 'y' },
      { id: 'z', name: 'Z', popularity: 2, genres: [], href: 'z' },
    ]).map((artist) => artist.id),
    ['y', 'z', 'x'],
  );

  console.log('Offline fetch/rank pipeline test passed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
