import { stringify } from 'csv-stringify/sync';

import { listObjects, getObject, putObject } from './utils/aws/s3';

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
      const fileArtists = await getObject(file.path) as Artist[];
      fileArtists.reduce((acc: Artist[], a: Artist) => {
        acc.push(a);
        return acc;
      }, artists);
    }
  }

  artists.sort((a: Artist, b: Artist) => (a.popularity > b.popularity ? -1 : 0));

  const csvStr = stringify(artists, { header: true });

  await putObject(csvStr, `data/${date}/ranked.csv`);
  
  return {
    rankedArtistsCsvStr: csvStr,
    artists: artists
  };
};

// rank()
//   .then(res => {
//     console.log(res);
//     process.exit(0);
//   }).catch(err => {
//     console.log(err);
//     process.exit(1);
//   });
