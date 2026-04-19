import type { Metadata } from 'next';
import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'Spotify Stats',
  description: 'Weekly rankings of Spotify artists',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            Spotify Stats
          </Link>
          <nav>
            <Link href="/">Top</Link>
            <Link href="/leaderboard">Leaderboard</Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
