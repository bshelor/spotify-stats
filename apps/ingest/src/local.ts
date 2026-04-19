import 'dotenv/config';

import { handler } from './handler.js';

handler()
  .then((res) => {
    console.log('done', res);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
