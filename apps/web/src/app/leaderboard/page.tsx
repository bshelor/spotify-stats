import Link from 'next/link';

import { getAllArtistsAt, getLatestCapturedAt } from '@spotify-stats/db';

import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

type Props = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

function buildLeaderboardHref(page: number, searchTerm?: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (searchTerm) params.set('q', searchTerm);
  const query = params.toString();
  return query ? `/leaderboard?${query}` : '/leaderboard';
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const latest = await getLatestCapturedAt();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1'));
  const searchTerm = params.q?.trim() ?? '';

  if (!latest) {
    return (
      <div className="empty">
        <h1>No data yet</h1>
      </div>
    );
  }

  const rowsWithSentinel = await getAllArtistsAt(
    latest,
    PAGE_SIZE + 1,
    (page - 1) * PAGE_SIZE,
    searchTerm || undefined,
  );
  const rows = rowsWithSentinel.slice(0, PAGE_SIZE);
  const hasMore = rowsWithSentinel.length > PAGE_SIZE;

  return (
    <>
      <h1>Leaderboard</h1>
      <div className="subtitle">Snapshot from {formatDate(latest)}</div>

      <form className="search-bar" method="get" action="/leaderboard">
        <input type="hidden" name="page" value="1" />
        <label className="search-label" htmlFor="leaderboard-search">
          Search
        </label>
        <input
          id="leaderboard-search"
          className="search-input"
          type="search"
          name="q"
          placeholder="Artist name or genre"
          defaultValue={searchTerm}
        />
        <button className="search-button" type="submit">
          Search
        </button>
        {searchTerm ? (
          <Link className="search-clear" href="/leaderboard">
            Clear
          </Link>
        ) : null}
      </form>

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

      <div className="page-nav">
        {page > 1 && <Link href={buildLeaderboardHref(page - 1, searchTerm)}>← Previous</Link>}
        {hasMore && <Link href={buildLeaderboardHref(page + 1, searchTerm)}>Next →</Link>}
      </div>
    </>
  );
}
