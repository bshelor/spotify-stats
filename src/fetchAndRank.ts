import fs from 'fs';
import path from 'path';

import { fetch } from './fetchAllArtists';
import { rank } from './rankArtists';
import { sendBatch } from './utils/sendgrid/emails';
import { prepareTopTenArtistSubstitutionData } from './utils/sendgrid/emails';

const dir = path.join(__dirname, '../src/html/weekly_rankings_report.html');

const RECIPIENTS = [
  'bshelor24@gmail.com',
  'christopher.a.shelor@gmail.com'
];

export const handler = async () => {
  const date = await fetch();
  const { rankedArtistsCsvStr, artists } = await rank(date);

  const topTen = prepareTopTenArtistSubstitutionData(artists);

  const emailTemplate = fs.readFileSync(dir, { encoding: 'utf8' });
  return await sendBatch(
    RECIPIENTS,
    `Spotify Rankings - Week of ${new Date().toLocaleDateString()}`,
    emailTemplate.toString(),
    emailTemplate.toString(),
    [
      {
        content: Buffer.from(rankedArtistsCsvStr).toString('base64'),
        filename: `all-ranked-artists-${new Date().toLocaleDateString()}.csv`,
        type: 'text/csv',
        disposition: 'attachment',
        content_id: 'mytext'
      }
    ],
    {
      ...topTen, 
      date: new Date(date).toLocaleDateString()
    }
  )
};

// handler()
//   .then(res => {
//     console.log(res);
//     process.exit(0);
//   }).catch(err => {
//     console.log(err);
//     process.exit(1);
//   });
