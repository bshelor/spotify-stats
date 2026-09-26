import * as spotify from '../../services/spotify.js';
import type { MusicProviderAdapter } from '../types.js';

export const spotifyProvider: MusicProviderAdapter = {
  name: 'spotify',
  fetchArtists: spotify.fetchArtists,
};

export type { SpotifyArtist } from '../../services/spotify.js';
