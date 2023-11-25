import { fetch } from './fetchAllArtists';
import { rank } from './rankArtists';

const main = async () => {
  const date = await fetch();
  await rank(date);
};

main()
  .then((val) => {
    console.log(val);
    process.exit(0);
  }).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
