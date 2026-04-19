import { notFound } from 'next/navigation';

import { getArtistById, getArtistTimeSeries } from '@spotify-stats/db';

import { PopularityTrendChart } from '@/components/charts/PopularityTrendChart';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ArtistPage({ params }: Props) {
  const { id } = await params;
  const [artist, series] = await Promise.all([
    getArtistById(id),
    getArtistTimeSeries(id),
  ]);

  if (!artist) notFound();

  const chartData = series.map((s) => ({
    capturedAt: formatDate(s.capturedAt),
    popularity: s.popularity,
    rank: s.rank,
  }));

  const latest = series[series.length - 1];

  return (
    <>
      <h1>{artist.name}</h1>
      <div className="subtitle">
        {latest ? `Current rank #${latest.rank} · popularity ${latest.popularity}` : 'No snapshots yet'}
      </div>

      <div className="card">
        {chartData.length < 2 ? (
          <p className="empty" style={{ padding: 0 }}>
            Need at least 2 snapshots to chart trend (have {chartData.length}).
          </p>
        ) : (
          <PopularityTrendChart data={chartData} />
        )}
      </div>

      <h2>Metadata</h2>
      <div className="card">
        <p>
          <a href={artist.href} target="_blank" rel="noreferrer">
            Open in Spotify ↗
          </a>
        </p>
        <p className="genres">Genres: {artist.genres.join(', ') || '—'}</p>
        <p className="genres">First seen: {formatDate(artist.firstSeenAt)}</p>
        <p className="genres">Last seen: {formatDate(artist.lastSeenAt)}</p>
      </div>
    </>
  );
}
