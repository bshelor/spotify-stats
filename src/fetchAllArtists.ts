import { config } from 'dotenv';

import { putObject } from './utils/aws/s3';
import { Artist } from './rankArtists';
import * as spotify from './services/spotify';

config({ path: '.env' });

const alphabetLetters = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
  'y', 'z' 
];

/**
 * Fetch all artists and store in a JSON file in S3.
 */
export const fetch = async () => {
  let batchCount = 0;
  let next;
  const date = new Date().toISOString();
  const dir = `data/${date}`;
  try {
    const artistMap = new Map();
    // TODO: recursively search each letter to truly grab all artists. API limits to 1000 result set
    for (const letter of alphabetLetters) {
      next = undefined;
      let artistCountByLetter = 0;
      console.log(`Fetching artists starting with letter "${letter}"`);
      // fetch all artists for the letter
      while (next !== null) {
        const { artists, nextUrl } = await spotify.fetchArtists(letter, next);

        artistCountByLetter += artists.length;

        artists.forEach((i: spotify.SpotifyArtist) => {
          if (!spotify.isNoise(i)) {
            artistMap.set(i.id, {
              id: i.id,
              name: i.name,
              popularity: i.popularity
            });
          }
        });
        next = nextUrl;
      }
      console.log(`Fetched ${artistCountByLetter} artists for letter "${letter}"`);
    }

    console.log(`Fetched ${artistMap.size} artists`);

    const artistsForFile: Artist[] = [];
    artistMap.forEach((value: Artist, key) => { artistsForFile.push(value); });
    batchCount += 1;

    await putObject(artistsForFile, `${dir}/artists-${batchCount}.json`);
  } catch (error) {
    console.error(error);
  }

  return date;
};
