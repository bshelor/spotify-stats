import { config } from 'dotenv';

import { handler } from './handler.js';

config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('Local ingest requires an explicit DATABASE_URL; remote secret fallback is disabled');
}

handler()
  .then((res) => {
    console.log('done', res);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
