import { fetch } from './fetchAllArtists.js';
import { template } from './html/weekly_rankings_report.js';
import { sendBatch, prepareTopTenArtistSubstitutionData } from './utils/sendgrid/emails.js';
import { rank } from './rankArtists.js';
import { getSecret } from './utils/aws/secretsManager.js';

const RECIPIENTS = ['bshelor24@gmail.com', 'christopher.a.shelor@gmail.com'];

type ScheduledEvent = {
  time?: string;
};

function getCapturedAt(event?: ScheduledEvent) {
  if (!event?.time) return undefined;

  const capturedAt = new Date(event.time);
  return Number.isNaN(capturedAt.getTime()) ? undefined : capturedAt;
}

export const handler = async (event?: ScheduledEvent) => {
  if (!process.env.DATABASE_URL) {
    const dbUrl = await getSecret('artist_stats_database_url');
    if (!dbUrl) throw new Error('artist_stats_database_url secret missing');
    process.env.DATABASE_URL = dbUrl;
  }

  console.log('Starting weekly ingest handler');
  const capturedAt = await fetch(getCapturedAt(event));
  console.log(`Fetch pipeline completed for ${capturedAt.toISOString()}`);
  const { rankedArtistsCsvStr, artists } = await rank(capturedAt);
  console.log(`Ranked ${artists.length} artists for ${capturedAt.toISOString()}`);

  const topTen = prepareTopTenArtistSubstitutionData(artists);
  console.log('Preparing and sending email report');

  try {
    const emailResult = await sendBatch(
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

    return { capturedAt: capturedAt.toISOString(), email: emailResult };
  } catch (error) {
    console.error('Email report failed after successful DB ingest', error);
    return {
      capturedAt: capturedAt.toISOString(),
      email: { status: 'failed' },
    };
  }
};
