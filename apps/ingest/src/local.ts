import { config } from 'dotenv';

import { handler } from './handler.js';

config({ path: '.env' });

handler()
  .then((res) => {
    console.log('done', res);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
