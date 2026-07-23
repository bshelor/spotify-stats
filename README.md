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

If `DATABASE_URL` is missing, the ingest handler will try to load it from AWS Secrets Manager.

## Setup

```bash
pnpm install
```

If you manage Node with `nvm`, this repo targets the version in [`.nvmrc`](/Users/brysonshelor/src/spotify-stats/.nvmrc).

## Common Commands

- `pnpm build` - run the workspace build
- `pnpm dev:web` - run the Next.js web app
- `pnpm dev:ingest` - run the ingest job locally
- `pnpm type-check` - run TypeScript checks across the workspace
- `pnpm --filter @spotify-stats/ingest dev` - run the ingest pipeline locally
- `pnpm --filter @spotify-stats/db db:migrate` - apply database migrations

## Notes

- The ingest flow fetches from Spotify, ranks the results, and upserts both `artists` and `artistSnapshots`.
- This repo uses Turborepo through the local `turbo` dependency, so you should run commands through `pnpm` after installing dependencies.
