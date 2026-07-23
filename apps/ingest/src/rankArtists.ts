import { stringify } from 'csv-stringify/sync';

import { getRankedArtistsAt } from '@spotify-stats/db';

export type Artist = {
  id: string;
  name: string;
  popularity: number;
  genres: string[];
  href: string;
};

export const rank = async (capturedAt: Date) => {
  const artists = await getRankedArtistsAt(capturedAt);
  const csvStr = stringify(artists, { header: true });

  return {
    rankedArtistsCsvStr: csvStr,
    artists,
    capturedAt,
  };
};
