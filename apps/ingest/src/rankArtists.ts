import { stringify } from 'csv-stringify/sync';

import { upsertArtistsAndSnapshot } from '@spotify-stats/db';

import { listObjects, getObject, putObject } from './utils/aws/s3.js';

export type Artist = {
  id: string;
  name: string;
  popularity: number;
  genres: string[];
  href: string;
};

export const rank = async (date: string) => {
  const dir = `data/${date}`;
  const res = await listObjects(dir);
  const artists: Artist[] = [];
  for (const file of res.objects) {
    if (!file.path.includes('ranked')) {
      const fileArtists = (await getObject(file.path)) as Artist[];
      fileArtists.reduce((acc: Artist[], a: Artist) => {
        acc.push(a);
        return acc;
      }, artists);
    }
  }

  artists.sort((a, b) => (a.popularity > b.popularity ? -1 : 0));

  const csvStr = stringify(artists, { header: true });

  await putObject(csvStr, `data/${date}/ranked.csv`);

  const capturedAt = new Date(date);
  await upsertArtistsAndSnapshot(artists, capturedAt);

  return {
    rankedArtistsCsvStr: csvStr,
    artists,
    capturedAt,
  };
};
