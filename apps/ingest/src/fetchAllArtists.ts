import { config } from 'dotenv';

import { upsertArtistsAndSnapshot } from '@spotify-stats/db';
import { runFetchPipeline } from './pipeline.js';
import * as spotify from './services/spotify.js';

config({ path: '.env' });

export const fetch = async (capturedAt?: Date) => {
  try {
    const result = await runFetchPipeline(
      spotify.fetchArtists,
      upsertArtistsAndSnapshot,
      undefined,
      undefined,
      capturedAt,
    );
    return result.capturedAt;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
