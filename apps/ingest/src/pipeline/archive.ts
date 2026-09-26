import { rank } from '../rankArtists.js';
import type { Artist } from '../rankArtists.js';
import { putObject } from '../utils/aws/s3.js';

function archiveDir(capturedAt: Date) {
  return `data/${capturedAt.toISOString()}`;
}

export async function archiveRankingSnapshot(capturedAt: Date, artists: Artist[]) {
  const dir = archiveDir(capturedAt);
  await putObject(artists, `${dir}/artists-1.json`);

  const { rankedArtistsCsvStr } = await rank(capturedAt);
  await putObject(rankedArtistsCsvStr, `${dir}/ranked.csv`);
}
