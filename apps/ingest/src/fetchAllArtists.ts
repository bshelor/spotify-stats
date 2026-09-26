import { config } from 'dotenv';

import { upsertArtistsAndSnapshot } from '@spotify-stats/db';
import { runFetchPipeline } from './pipeline.js';
import { spotifyProvider } from './providers/spotify/index.js';

config({ path: '.env' });

export const fetch = async (capturedAt?: Date, ingestRunId?: string) => {
  try {
    const result = await runFetchPipeline(
      spotifyProvider,
      (artists, capturedAt) => upsertArtistsAndSnapshot(artists, capturedAt, {
        provider: spotifyProvider.name,
        ingestRunId,
      }),
      undefined,
      undefined,
      capturedAt,
    );
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
