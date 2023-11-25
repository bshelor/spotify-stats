import { readFile, readdir, writeFile } from 'fs/promises';
import { toCsv } from './utils/toCsv';

export type Artist = {
  id: string;
  name: string;
  popularity: number;
};

export const rank = async (date: string) => {
  const dir = `data/${date}`;
  const files = await readdir(dir);
  const artists: Artist[] = [];
  for (const file of files) {
    const fileArtists = JSON.parse((await readFile(`${dir}/${file}`)).toString());
    console.log(artists[0]);
    fileArtists.reduce((acc: Artist[], a: Artist) => {
      acc.push(a);
      return acc;
    }, artists);
  }

  artists.sort((a: Artist, b: Artist) => (a.popularity > b.popularity ? -1 : 0));

  const csvStr = toCsv(artists);

  await writeFile(`data/${date}/ranked.csv`, csvStr);
};
