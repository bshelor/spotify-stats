import type { FetchArtistsResult } from '../pipeline.js';
import type { FetchArtistsOptions } from '../services/spotify.js';

export type MusicProviderName = 'spotify';

export type MusicProviderAdapter = {
  name: MusicProviderName;
  fetchArtists: (
    query: string,
    options?: FetchArtistsOptions,
  ) => Promise<FetchArtistsResult>;
};
