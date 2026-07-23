import Link from 'next/link';

import {
  getBiggestMovers,
  getCaptureDates,
  getLatestCapturedAt,
  getTopArtistsAt,
} from '@spotify-stats/db';

import { TopArtistsChart } from '../components/charts/TopArtistsChart';
import { deltaLabel, formatDate } from '../lib/format';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const latest = await getLatestCapturedAt();

  if (!latest) {
    return (
      <div className="empty">
        <h1>No data yet</h1>
        <p>Run the ingest worker to populate the first snapshot.</p>
      </div>
    );
  }

  const captures = await getCaptureDates(2);
  const previous = captures[1];
  const [top, movers] = await Promise.all([
    getTopArtistsAt(latest, 10),
    previous ? getBiggestMovers(previous, latest, 5) : Promise.resolve([]),
  ]);

  const chartData = top.map((a) => ({ name: a.name, popularity: a.popularity }));

  return (
    <>
      <h1>Top 10 Artists</h1>
      <div className="subtitle">Snapshot from {formatDate(latest)}</div>

      <div className="grid-two">
        <div className="card">
          <TopArtistsChart data={chartData} />
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Biggest Movers</h2>
          {movers.length === 0 ? (
            <p className="empty" style={{ padding: 0 }}>
              Need at least 2 snapshots to compute deltas.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Artist</th>
                  <th>Rank</th>
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                {movers.map((m) => {
                  const delta = deltaLabel(m.delta);
                  return (
                    <tr key={m.id}>
                      <td>
                        <Link href={`/artists/${m.id}`}>{m.name}</Link>
                      </td>
                      <td>{m.currentRank}</td>
                      <td className={delta.className}>{delta.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <h2>Leaderboard Preview</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Artist</th>
              <th>Popularity</th>
              <th>Genres</th>
            </tr>
          </thead>
          <tbody>
            {top.map((a) => (
              <tr key={a.id}>
                <td>{a.rank}</td>
                <td>
                  <Link href={`/artists/${a.id}`}>{a.name}</Link>
                </td>
                <td>{a.popularity}</td>
                <td className="genres">{a.genres.slice(0, 3).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
