import {
  completeIngestRun,
  createIngestRun,
  failIngestRun,
  musicProvider,
} from '@spotify-stats/db';
import { fetch } from './fetchAllArtists.js';
import { archiveRankingSnapshot } from './pipeline/archive.js';
import { sendWeeklyRankingReport } from './reports/weeklyRankings.js';
import { getSecret } from './utils/aws/secretsManager.js';

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
  const capturedAt = getCapturedAt(event) ?? new Date();
  const ingestRunId = `${musicProvider.spotify}-${capturedAt.toISOString()}`;
  await createIngestRun({
    id: ingestRunId,
    provider: musicProvider.spotify,
    capturedAt,
  });

  try {
    const { rankedArtists } = await fetch(capturedAt, ingestRunId);
    console.log(`Fetch pipeline completed for ${capturedAt.toISOString()}`);
    await archiveRankingSnapshot(capturedAt, rankedArtists);
    console.log(`Archived ranking snapshot for ${capturedAt.toISOString()}`);
    await completeIngestRun(ingestRunId, {
      artistCount: rankedArtists.length,
      snapshotCount: rankedArtists.length,
    });
  } catch (error) {
    await failIngestRun(ingestRunId, error);
    throw error;
  }

  try {
    const emailResult = await sendWeeklyRankingReport(capturedAt);
    return { capturedAt: capturedAt.toISOString(), email: emailResult };
  } catch (error) {
    console.error('Email report failed after successful DB ingest', error);
    return {
      capturedAt: capturedAt.toISOString(),
      email: { status: 'failed' },
    };
  }
};
