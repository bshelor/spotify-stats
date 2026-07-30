import { config } from 'dotenv';

import { upsertArtistsAndSnapshot } from '@spotify-stats/db';
import { runFetchPipeline } from './pipeline.js';
import * as spotify from './services/spotify.js';

config({ path: '.env' });

export const fetch = async () => {
  try {
    const { capturedAt } = await runFetchPipeline(
      spotify.fetchArtists,
      upsertArtistsAndSnapshot,
    );
    return capturedAt;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
