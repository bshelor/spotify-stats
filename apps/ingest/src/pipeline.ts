import type { Artist } from './rankArtists.js';
import * as spotify from './services/spotify.js';
import type { FetchArtistsOptions } from './services/spotify.js';

export const alphabetLetters = [
  'a',
  'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
  'y', 'z',
];

export const digitTokens = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
];

export type FetchArtistsResult = {
  artists: spotify.SpotifyArtist[];
  total: number;
  limit: number;
  offset: number;
  nextUrl: string | null;
};

export type FetchArtistsFn = (
  query: string,
  options?: FetchArtistsOptions,
) => Promise<FetchArtistsResult>;
export type PersistArtistsFn = (artists: Artist[], capturedAt: Date) => Promise<void>;

export type SearchPass = {
  label: string;
  queries: string[];
  pagination: 'next' | 'offset';
  limit?: number;
};

// Spotify search is keyword-based, so we combine a broad coverage pass with a
// wider fan-out pass, then dedupe by artist id after paging each search term.
export const defaultPrimarySearchQueries = alphabetLetters;
export const defaultSupplementalSearchQueries = [
  ...alphabetLetters,
  ...alphabetLetters.map((letter) => `artist:${letter}`),
  ...digitTokens,
  ...digitTokens.map((digit) => `artist:${digit}`),
];

export function rankArtistsForPersist(artists: Artist[]) {
  return [...artists].sort((left, right) => right.popularity - left.popularity);
}

async function runSearchPass(
  pass: SearchPass,
  fetchArtists: FetchArtistsFn,
  artistMap: Map<string, Artist>,
) {
  console.log(`Starting ${pass.label} search pass with ${pass.queries.length} queries`);

  for (const query of pass.queries) {
    let artistCountByQuery = 0;
    console.log(`Fetching artists for query "${query}"`);

    if (pass.pagination === 'next') {
      let nextUrl: string | undefined;
      while (true) {
        const { artists, nextUrl: responseNextUrl } = await fetchArtists(
          query,
          nextUrl ? { nextUrl } : { limit: pass.limit },
        );
        artistCountByQuery += artists.length;

        artists.forEach((artist) => {
          if (!spotify.isNoise(artist)) {
            artistMap.set(artist.id as string, {
              id: artist.id as string,
              name: artist.name,
              popularity: artist.popularity,
              genres: artist.genres,
              href: `https://open.spotify.com/artist/${artist.id}`,
            });
          }
        });

        if (!responseNextUrl) {
          break;
        }

        nextUrl = responseNextUrl;
      }
    } else {
      let offset = 0;
      while (true) {
        const { artists, total, offset: responseOffset } = await fetchArtists(query, {
          offset,
        });
        artistCountByQuery += artists.length;

        artists.forEach((artist) => {
          if (!spotify.isNoise(artist)) {
            artistMap.set(artist.id as string, {
              id: artist.id as string,
              name: artist.name,
              popularity: artist.popularity,
              genres: artist.genres,
              href: `https://open.spotify.com/artist/${artist.id}`,
            });
          }
        });

        if (artists.length === 0) {
          break;
        }

        offset = responseOffset + artists.length;
        if (offset >= total) {
          break;
        }
      }
    }

    console.log(`Fetched ${artistCountByQuery} artists for query "${query}"`);
  }

  console.log(`Finished ${pass.label} search pass`);
}

export async function runFetchPipeline(
  fetchArtists: FetchArtistsFn,
  persistArtists: PersistArtistsFn,
  primaryQueries: string[] = defaultPrimarySearchQueries,
  supplementalQueries: string[] = defaultSupplementalSearchQueries,
) {
  const capturedAt = new Date();
  const artistMap = new Map<string, Artist>();

  await runSearchPass(
    { label: 'primary', queries: primaryQueries, pagination: 'next', limit: 50 },
    fetchArtists,
    artistMap,
  );
  await runSearchPass(
    { label: 'supplemental', queries: supplementalQueries, pagination: 'offset' },
    fetchArtists,
    artistMap,
  );

  console.log(`Fetched ${artistMap.size} artists`);

  const rankingStartedAt = Date.now();
  console.log(`Ranking ${artistMap.size} unique artists`);
  const rankedArtists = rankArtistsForPersist(Array.from(artistMap.values()));
  console.log(
    `Ranked ${rankedArtists.length} artists in ${Date.now() - rankingStartedAt}ms`,
  );

  const persistStartedAt = Date.now();
  console.log(`Persisting ranked artists captured at ${capturedAt.toISOString()}`);
  await persistArtists(rankedArtists, capturedAt);
  console.log(`Persisted ranked artists in ${Date.now() - persistStartedAt}ms`);

  return {
    capturedAt,
    rankedArtists,
  };
}
