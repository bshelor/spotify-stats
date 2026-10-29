# spotify-stats
Calculate statistics around artist popularity in Spotify.

## Prerequisites

- Node.js 22 or newer
- `pnpm` 10.12.1
- Access to AWS credentials if you want to run the ingest flow locally, because it reads secrets from AWS Secrets Manager
- A `.env` file at the repo root for local development

## Environment

The ingest pipeline expects these values or secrets:

- `DATABASE_URL` for the live database connection
- `spotify_auth_token` in AWS Secrets Manager
- `artist_stats_database_url` in AWS Secrets Manager if `DATABASE_URL` is not already set
- Verified AWS SES sender and recipient identities in `us-east-1` while the AWS account is in the SES sandbox

If `DATABASE_URL` is missing, the ingest handler will try to load it from AWS Secrets Manager.

## Setup

```bash
pnpm install
```

If you manage Node with `nvm`, this repo targets the version in [`.nvmrc`](/Users/brysonshelor/src/spotify-stats/.nvmrc).

## Common Commands

- `pnpm build` - run the workspace build
- `pnpm dev:local` - start local Postgres, migrate, seed, and launch the web app
- `pnpm dev:web` - run the Next.js web app
- `pnpm dev:ingest` - run the ingest job locally
- `pnpm type-check` - run TypeScript checks across the workspace
- `pnpm --filter @spotify-stats/ingest dev` - run the ingest pipeline locally
- `pnpm --filter @spotify-stats/db db:migrate` - apply database migrations

## Notes

- The ingest flow fetches from Spotify, ranks the results, and upserts both `artists` and `artistSnapshots`.
- Ingest runs are tracked in Postgres with provider, status, row counts, and errors for easier retry/debug history.
- Artist snapshots are provider-aware, and provider-specific IDs are stored separately so future providers can map into the same canonical artist table.
- Each successful ingest archives the ranked artist JSON and CSV under `data/{capturedAt}/` in S3. Objects under `data/` transition to Glacier Instant Retrieval after five years.
- Weekly email reports are sent through AWS SES. If SES production access is not enabled, both the sender and recipients must be verified identities.
- This repo uses Turborepo through the local `turbo` dependency, so you should run commands through `pnpm` after installing dependencies.

## Local Postgres and database tests

Docker must be running. The Compose database binds only to loopback port 55432
and persists across `db:down` / `db:up`. It uses Postgres 17.6; confirm the Neon
Postgres major version before treating local results as production parity.

```bash
pnpm dev:local
```

Open http://localhost:3000. This command waits for Postgres to be healthy, applies
migrations and repeatable fixtures, then starts Next.js with the local database
URL overriding any inherited URL or frontend `.env.local`. The local frontend uses polling for file changes to avoid OS file-watcher limits.
Setup failures stop
the command before the frontend starts. No AWS, Spotify, or Neon credentials
are needed. Press Ctrl+C to stop the frontend; Postgres stays running for reuse.
Run `pnpm db:down` when finished with the database.

Set `DATABASE_URL=postgresql://spotify:spotify@127.0.0.1:55432/spotify_stats_dev`
explicitly when running `pnpm dev:ingest`. This invokes real
Spotify and AWS services; it is not an offline test. The local entry point
requires a URL and never falls back to the remote database secret. Existing
environment variables take precedence over dotenv files.

`db:migrate:local` and `db:seed` always target the Compose development database,
regardless of ambient `DATABASE_URL`. Seeds are repeatable and add 50 artists
with 10 weekly capture dates each (500 snapshots), varied genres, and changing
popularity and ranks. Existing fixture rows are updated; other local data is preserved. `pnpm db:down` preserves data; to intentionally erase
local development data, run `docker compose down --volumes`.

```bash
pnpm test:db
pnpm --filter @spotify-stats/ingest test:pipeline
```

`test:db` starts a separate disposable Postgres container with a random port,
tests the legacy migration/backfill, applies the migration chain to an empty
database, and runs the real ingest query integration test. It overrides any
inherited database URL, does not read `.env`, and stops the container afterward.
It does not need Neon, Spotify, or AWS credentials. The raw ingest test rejects
nonlocal targets and should only be invoked through this runner. CI can run the
same commands with Docker available. Images must be downloaded on first use.

The application uses Drizzle with `pg` for both local Postgres and Neon. The pool
is limited to two connections per process and uses the connection string's TLS
settings; retain Neon's SSL parameters and use its pooled endpoint for deployed
Lambda workloads. Pools are reused across warm invocations. Call `closeDb()` in
scripts/tests when finished. Use `createDb(url)` for independently owned clients.

Use `db:generate` to commit schema changes as migrations. `db:migrate` remains
an explicit `DATABASE_URL`-targeted command for managed environments; it does not
load the root `.env` automatically. Never use production credentials for tests.
