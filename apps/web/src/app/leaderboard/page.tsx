import Link from 'next/link';

import { getAllArtistsAt, getLatestCapturedAt } from '@spotify-stats/db';

import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function LeaderboardPage({ searchParams }: Props) {
  const latest = await getLatestCapturedAt();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1'));

  if (!latest) {
    return (
      <div className="empty">
        <h1>No data yet</h1>
      </div>
    );
  }

  const rows = await getAllArtistsAt(latest, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <>
      <h1>Leaderboard</h1>
      <div className="subtitle">Snapshot from {formatDate(latest)}</div>

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
            {rows.map((a) => (
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

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        {page > 1 && <Link href={`/leaderboard?page=${page - 1}`}>← Previous</Link>}
        {rows.length === PAGE_SIZE && <Link href={`/leaderboard?page=${page + 1}`}>Next →</Link>}
      </div>
    </>
  );
}
