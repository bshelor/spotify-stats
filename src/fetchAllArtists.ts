import axios from 'axios';
import { AxiosResponse } from 'axios';
import { Artist } from './rankArtists';
import { config } from 'dotenv';
import { putObject } from './utils/aws-s3';

config({ path: '.env' });

const spotifyBase = 'https://api.spotify.com/v1';
const BATCH_LIMIT = 100000;
const alphabetLetters = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
  'y', 'z' 
];

let token: string;
const authorize = async () => {
  const paramStr = 'grant_type=client_credentials';
  const response = await axios.request({
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${process.env['AUTH_KEY']}`
    },
    url: 'https://accounts.spotify.com/api/token',
    data: paramStr
  });

  token = response.data.access_token;
};

/**
 * @{link https://developer.spotify.com/documentation/web-api/reference/search}
 */
export const fetch = async () => {
  await authorize();

  let batchCount = 0;
  let next;
  const date = new Date().toISOString();
  const dir = `data/${date}`;
  try {
    const artistMap = new Map();
    for (const letter of alphabetLetters) {
      next = undefined;
      let artistCountByLetter = 0;
      console.log(`Fetching artists starting with letter "${letter}"`);
      // fetch all artists for the letter
      while (next !== null) {
        const queryStr = `q=${letter}&type=artist`;
        const url = next || `${spotifyBase}/search?${queryStr}&limit=50`;
        console.log(`Requesting... url=${url}`);
        const response = await axios.request({
          method: 'GET',
          url: url,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }) as AxiosResponse;

        if (response.status >= 300) {
          throw new Error(`Request failed. Response: ${JSON.stringify(response.data)}. Request: ${JSON.stringify(response.request)}`);
        }

        artistCountByLetter += response.data.artists.items.length;

        response.data.artists.items.forEach((i: Record<string, any>) => {
          artistMap.set(i.id, {
            id: i.id,
            name: i.name,
            popularity: i.popularity
          });
        });
        next = response.data.artists.next;
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
