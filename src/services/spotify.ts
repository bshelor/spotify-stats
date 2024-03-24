import axios from 'axios';
import { AxiosResponse } from 'axios';

import { getSecret } from '../utils/aws/secretsManager';

const spotifyBase = 'https://api.spotify.com/v1';

export type SpotifyArtist = {
  name: string;
  popularity: number;
  [name: string]: unknown;
};

let token: string | undefined = undefined;

/**
 * Determine if the artist is a noisy data point from Spotify's API.
 *
 * Still need to investigate what these are, but we seem to receive "artists"
 * that are not artists at all.
 * @param artist 
 */
export const isNoise = (artist: SpotifyArtist) => {
  if (artist.name.length === 1 && artist.popularity === 0) {
    return true;
  }
  return false;
}

/**
 * Fetch a new token for the Spotify API
 * @returns auth token
 */
export const authorize = async () => {
  const paramStr = 'grant_type=client_credentials';
  const authToken = await getSecret('spotify_auth_token');
  const response = await axios.request({
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authToken}`
    },
    url: 'https://accounts.spotify.com/api/token',
    data: paramStr
  });

  return response.data.access_token;
};

/**
 * Fetch artists using the search endpoint.
 *
 * {@link https://developer.spotify.com/documentation/web-api/reference/search}
 *
 * @param query - query string that can be used to narrow down artist search
 * @param next - next url string if available from previous API requests
 */
export const fetchArtists = async (query: string, next?: string) => {
  if (!token) {
    token = await authorize();
  }

  const queryStr = `q=${query}&type=artist`;
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

  return {
    artists: response.data.artists.items as SpotifyArtist[],
    nextUrl: response.data.artists.next as string | null
  };
}
