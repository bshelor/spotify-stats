import { fetch } from './fetchAllArtists';
import { template } from './html/weekly_rankings_report';
import { sendBatch } from './utils/sendgrid/emails';
import { prepareTopTenArtistSubstitutionData } from './utils/sendgrid/emails';
import { rank } from './rankArtists';

const RECIPIENTS = [
  'bshelor24@gmail.com',
  'christopher.a.shelor@gmail.com'
];

export const handler = async () => {
  const date = await fetch();
  const { rankedArtistsCsvStr, artists } = await rank(date);

  const topTen = prepareTopTenArtistSubstitutionData(artists);

  return await sendBatch(
    RECIPIENTS,
    `Spotify Rankings - Week of ${new Date().toLocaleDateString()}`,
    template,
    template,
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
