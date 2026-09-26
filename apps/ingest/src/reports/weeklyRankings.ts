import { rank } from '../rankArtists.js';
import { template } from '../html/weekly_rankings_report.js';
import { prepareTopTenArtistSubstitutionData, sendBatch } from '../utils/aws/ses.js';

const RECIPIENTS = ['bshelor24@gmail.com', 'christopher.a.shelor@gmail.com'];

export async function sendWeeklyRankingReport(capturedAt: Date) {
  const { rankedArtistsCsvStr, artists } = await rank(capturedAt);
  console.log(`Ranked ${artists.length} artists for ${capturedAt.toISOString()}`);

  const topTen = prepareTopTenArtistSubstitutionData(artists);
  console.log('Preparing and sending email report');

  return sendBatch(
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
}
