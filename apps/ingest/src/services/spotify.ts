import axios, { type AxiosResponse } from 'axios';

import { getSecret } from '../utils/aws/secretsManager.js';

const spotifyBase = 'https://api.spotify.com/v1';
const defaultSearchLimit = 10;

export type SpotifyArtist = {
  name: string;
  popularity: number;
  href: string;
  genres: string[];
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
};

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

export type FetchArtistsOptions = {
  offset?: number;
  nextUrl?: string;
  limit?: number;
};

/**
 * Fetch artists using the search endpoint.
 *
 * {@link https://developer.spotify.com/documentation/web-api/reference/search}
 *
 * @param query - query string that can be used to narrow down artist search
 * @param options - pagination controls for either offset-based or next-url paging
 */
export const fetchArtists = async (query: string, options: FetchArtistsOptions = {}) => {
  if (!token) {
    token = await authorize();
  }

  const { nextUrl, offset, limit = defaultSearchLimit } = options;
  const url = nextUrl
    ? new URL(nextUrl)
    : new URL(`${spotifyBase}/search`);

  if (!nextUrl) {
    url.searchParams.set('q', query);
    url.searchParams.set('type', 'artist');
    url.searchParams.set('limit', String(limit));
    if (offset !== undefined) {
      url.searchParams.set('offset', String(offset));
    }
  }

  console.log(`Requesting... url=${url.toString()}`);
  const response = await axios.request({
    method: 'GET',
    url: url.toString(),
    headers: {
      Authorization: `Bearer ${token}`
    }
  }) as AxiosResponse;

  if (response.status >= 300) {
    throw new Error(`Request failed. Response: ${JSON.stringify(response.data)}. Request: ${JSON.stringify(response.request)}`);
  }

  return {
    artists: response.data.artists.items as SpotifyArtist[],
    total: response.data.artists.total as number,
    limit: response.data.artists.limit as number,
    offset: response.data.artists.offset as number,
    nextUrl: response.data.artists.next as string | null,
  };
};
