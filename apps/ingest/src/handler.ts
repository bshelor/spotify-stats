import { fetch } from './fetchAllArtists.js';
import { template } from './html/weekly_rankings_report.js';
import { sendBatch, prepareTopTenArtistSubstitutionData } from './utils/sendgrid/emails.js';
import { rank } from './rankArtists.js';
import { getSecret } from './utils/aws/secretsManager.js';

const RECIPIENTS = ['bshelor24@gmail.com', 'christopher.a.shelor@gmail.com'];

export const handler = async () => {
  if (!process.env.DATABASE_URL) {
    const dbUrl = await getSecret('artist_stats_database_url');
    if (!dbUrl) throw new Error('artist_stats_database_url secret missing');
    process.env.DATABASE_URL = dbUrl;
  }

  const date = await fetch();
  const { rankedArtistsCsvStr, artists, capturedAt } = await rank(date);

  const topTen = prepareTopTenArtistSubstitutionData(artists);

  return await sendBatch(
    RECIPIENTS,
    `Spotify Rankings - Week of ${new Date().toLocaleDateString()}`,
    template,
    template,
    [
      {
        content: Buffer.from(rankedArtistsCsvStr).toString('base64'),
        filename: `all-ranked-artists-${new Date().toLocaleDateString()}.csv`,
        type: 'text/csv',
        disposition: 'attachment',
        content_id: 'mytext',
      },
    ],
    {
      ...topTen,
      date: capturedAt.toLocaleDateString(),
    },
  );
};
