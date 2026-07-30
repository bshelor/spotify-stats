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

  console.log('Starting weekly ingest handler');
  const capturedAt = await fetch();
  console.log(`Fetch pipeline completed for ${capturedAt.toISOString()}`);
  const { rankedArtistsCsvStr, artists } = await rank(capturedAt);
  console.log(`Ranked ${artists.length} artists for ${capturedAt.toISOString()}`);

  const topTen = prepareTopTenArtistSubstitutionData(artists);
  console.log('Preparing and sending email report');

  return await sendBatch(
    RECIPIENTS,
    `Spotify Rankings - Week of ${capturedAt.toLocaleDateString()}`,
    template,
    template,
    [
      {
        content: Buffer.from(rankedArtistsCsvStr).toString('base64'),
        filename: `all-ranked-artists-${capturedAt.toLocaleDateString()}.csv`,
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
