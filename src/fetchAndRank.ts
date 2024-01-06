import { fetch } from './fetchAllArtists';
import { rank } from './rankArtists';
import { sendBatch } from './utils/sendgrid/emails';

const emailBody = `
  Here is your weekly report of the current artist rankings. Sourced from Spotify.
`

export const handler = async () => {
  const date = await fetch();
  // const date = '2024-01-06T18:21:00.840Z';
  const rankedArtistsCsvStr = await rank(date);
  return await sendBatch(
    ['bshelor24@gmail.com', 'christopher.a.shelor@gmail.com'],
    `Spotify Rankings - Week of ${new Date().toLocaleDateString()}`,
    emailBody,
    emailBody,
    [
      {
        content: Buffer.from(rankedArtistsCsvStr).toString('base64'),
        filename: `ranked-artists-${new Date().toLocaleDateString()}.csv`,
        type: 'text/csv',
        disposition: 'attachment',
        content_id: 'mytext'
      }
    ]
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
