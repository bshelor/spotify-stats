import Link from 'next/link';

import {
  getLatestCapturedAt,
  getLeaderboard,
  getLeaderboardCount,
  type LeaderboardDir,
  type LeaderboardSort,
} from '@spotify-stats/db';

import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;
const VALID_SORTS: LeaderboardSort[] = ['rank', 'popularity', 'name'];

type SearchParams = {
  q?: string;
  popMin?: string;
  popMax?: string;
  rankMin?: string;
  rankMax?: string;
  genre?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

function parseIntOrUndefined(v: string | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseSort(v: string | undefined): LeaderboardSort {
  return VALID_SORTS.includes(v as LeaderboardSort) ? (v as LeaderboardSort) : 'rank';
}

function parseDir(v: string | undefined): LeaderboardDir {
  return v === 'desc' ? 'desc' : 'asc';
}

function toggleSortHref(
  column: LeaderboardSort,
  currentSort: LeaderboardSort,
  currentDir: LeaderboardDir,
  params: SearchParams,
): string {
  const nextDir: LeaderboardDir =
    currentSort === column ? (currentDir === 'asc' ? 'desc' : 'asc') : 'asc';
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.popMin) sp.set('popMin', params.popMin);
  if (params.popMax) sp.set('popMax', params.popMax);
  if (params.rankMin) sp.set('rankMin', params.rankMin);
  if (params.rankMax) sp.set('rankMax', params.rankMax);
  if (params.genre) sp.set('genre', params.genre);
  sp.set('sort', column);
  sp.set('dir', nextDir);
  return `/leaderboard?${sp.toString()}`;
}

function sortIndicator(
  column: LeaderboardSort,
  currentSort: LeaderboardSort,
  currentDir: LeaderboardDir,
): string {
  if (currentSort !== column) return '';
  return currentDir === 'asc' ? ' ▲' : ' ▼';
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const latest = await getLatestCapturedAt();

  if (!latest) {
    return (
      <div className="empty">
        <h1>No data yet</h1>
      </div>
    );
  }

  const sort = parseSort(params.sort);
  const dir = parseDir(params.dir);
  const page = Math.max(1, Number(params.page ?? '1'));

  const filters = {
    q: params.q,
    popMin: parseIntOrUndefined(params.popMin),
    popMax: parseIntOrUndefined(params.popMax),
    rankMin: parseIntOrUndefined(params.rankMin),
    rankMax: parseIntOrUndefined(params.rankMax),
    genre: params.genre,
  };

  const [rows, total] = await Promise.all([
    getLeaderboard({
      capturedAt: latest,
      filters,
      sort,
      dir,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getLeaderboardCount({ capturedAt: latest, filters }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = Boolean(
    params.q || params.popMin || params.popMax || params.rankMin || params.rankMax || params.genre,
  );

  return (
    <>
      <h1>Leaderboard</h1>
      <div className="subtitle">
        Snapshot from {formatDate(latest)} · {total.toLocaleString()} artists
        {hasActiveFilters ? ' (filtered)' : ''}
      </div>

      <form method="get" action="/leaderboard" className="filter-bar card">
        <div className="filter-group">
          <label htmlFor="f-q">Search</label>
          <input id="f-q" name="q" defaultValue={params.q ?? ''} placeholder="artist name" />
        </div>

        <div className="filter-group">
          <label htmlFor="f-genre">Genre</label>
          <input id="f-genre" name="genre" defaultValue={params.genre ?? ''} placeholder="e.g. pop" />
        </div>

        <div className="filter-group filter-range">
          <label>Popularity</label>
          <input
            name="popMin"
            type="number"
            min={0}
            max={100}
            defaultValue={params.popMin ?? ''}
            placeholder="min"
          />
          <input
            name="popMax"
            type="number"
            min={0}
            max={100}
            defaultValue={params.popMax ?? ''}
            placeholder="max"
          />
        </div>

        <div className="filter-group filter-range">
          <label>Rank</label>
          <input
            name="rankMin"
            type="number"
            min={1}
            defaultValue={params.rankMin ?? ''}
            placeholder="min"
          />
          <input
            name="rankMax"
            type="number"
            min={1}
            defaultValue={params.rankMax ?? ''}
            placeholder="max"
          />
        </div>

        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />

        <div className="filter-actions">
          <button type="submit">Apply</button>
          {hasActiveFilters && (
            <Link href="/leaderboard" className="filter-clear">
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <table>
          <thead>
            <tr>
              <th>
                <Link href={toggleSortHref('rank', sort, dir, params)}>
                  #{sortIndicator('rank', sort, dir)}
                </Link>
              </th>
              <th>
                <Link href={toggleSortHref('name', sort, dir, params)}>
                  Artist{sortIndicator('name', sort, dir)}
                </Link>
              </th>
              <th>
                <Link href={toggleSortHref('popularity', sort, dir, params)}>
                  Popularity{sortIndicator('popularity', sort, dir)}
                </Link>
              </th>
              <th>Genres</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty" style={{ padding: '1.5rem' }}>
                  No artists match these filters.
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id}>
                  <td>{a.rank}</td>
                  <td>
                    <Link href={`/artists/${a.id}`}>{a.name}</Link>
                  </td>
                  <td>{a.popularity}</td>
                  <td className="genres">{a.genres.slice(0, 3).join(', ')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pager">
          <span className="pager-info">
            Page {page} of {totalPages}
          </span>
          <div className="pager-links">
            {page > 1 && (
              <Link href={pagerHref(params, sort, dir, page - 1)}>← Previous</Link>
            )}
            {page < totalPages && (
              <Link href={pagerHref(params, sort, dir, page + 1)}>Next →</Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function pagerHref(
  params: SearchParams,
  sort: LeaderboardSort,
  dir: LeaderboardDir,
  page: number,
): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.popMin) sp.set('popMin', params.popMin);
  if (params.popMax) sp.set('popMax', params.popMax);
  if (params.rankMin) sp.set('rankMin', params.rankMin);
  if (params.rankMax) sp.set('rankMax', params.rankMax);
  if (params.genre) sp.set('genre', params.genre);
  sp.set('sort', sort);
  sp.set('dir', dir);
  if (page > 1) sp.set('page', String(page));
  return `/leaderboard?${sp.toString()}`;
}
