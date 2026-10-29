import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { createDb } from '../src/client';
import { artists, artistSnapshots } from '../src/schema';

// Deliberately independent of DATABASE_URL and any production .env files.
const { db, close } = createDb('postgresql://spotify:spotify@127.0.0.1:55432/spotify_stats_dev');
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  if (process.argv[2] === 'seed') {
    const genreGroups = [
      ['indie', 'alternative'],
      ['rock', 'punk'],
      ['pop', 'dance'],
      ['hip hop', 'r&b'],
      ['jazz', 'soul'],
      ['electronic', 'ambient'],
      ['folk', 'country'],
      ['metal', 'progressive rock'],
    ];
    const firstCapturedAt = new Date('2026-01-01T00:00:00Z');
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const fixtures = Array.from({ length: 50 }, (_, i) => ({
      id: i === 0 ? 'local-alpha' : i === 1 ? 'local-beta' : `local-artist-${String(i + 1).padStart(2, '0')}`,
      name: i === 0 ? 'Local Alpha' : i === 1 ? 'Local Beta' : `Local Artist ${String(i + 1).padStart(2, '0')}`,
      href: `https://example.com/artists/${i + 1}`,
      genres: genreGroups[i % genreGroups.length]!,
      firstSeenAt: firstCapturedAt,
      lastSeenAt: new Date(firstCapturedAt.getTime() + 9 * weekMs),
    }));
    // Only update our fixture IDs; preserve any other local development data.
    await db.transaction(async (tx) => {
      for (const artist of fixtures) {
        await tx.insert(artists).values(artist).onConflictDoUpdate({
          target: artists.id,
          set: artist,
        });
      }
      for (let week = 0; week < 10; week++) {
        const capturedAt = new Date(firstCapturedAt.getTime() + week * weekMs);
        // Deterministic waves and differing trends produce rises, falls, and rank changes.
        const ranked = fixtures.map((artist, i) => ({
          artist,
          popularity: Math.max(0, Math.min(100, Math.round(
            50 + 25 * Math.sin(i * 1.7 + week * 0.8) + (i % 7 - 3) * week,
          ))),
        })).sort((a, b) => b.popularity - a.popularity || a.artist.id.localeCompare(b.artist.id));
        for (const [i, { artist, popularity }] of ranked.entries()) {
          await tx.insert(artistSnapshots).values({
            artistId: artist.id,
            capturedAt,
            popularity,
            rank: i + 1,
          }).onConflictDoUpdate({
            target: [artistSnapshots.artistId, artistSnapshots.provider, artistSnapshots.capturedAt],
            set: { popularity, rank: i + 1 },
          });
        }
      }
    });
    console.log('Local development fixtures seeded: 50 artists, 10 weekly snapshots each');
  }
} finally {
  await close();
}
