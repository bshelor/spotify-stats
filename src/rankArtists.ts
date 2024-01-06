import { toCsv } from './utils/toCsv';
import { listObjects, getObject, putObject } from './utils/aws-s3';

export type Artist = {
  id: string;
  name: string;
  popularity: number;
};

export const rank = async (date: string) => {
  const dir = `data/${date}`;
  const res = await listObjects(dir);
  const artists: Artist[] = [];
  for (const file of res.objects) {
    const fileArtists = await getObject(file.path) as Artist[];
    fileArtists.reduce((acc: Artist[], a: Artist) => {
      acc.push(a);
      return acc;
    }, artists);
  }

  artists.sort((a: Artist, b: Artist) => (a.popularity > b.popularity ? -1 : 0));

  const csvStr = toCsv(artists);

  await putObject(csvStr, `data/${date}/ranked.csv`);
};
