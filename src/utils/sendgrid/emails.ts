import sgMail from '@sendgrid/mail';
import { config } from 'dotenv';
import { getSecret } from '../aws/secretsManager';
import { Artist } from '../../rankArtists';

config({ path: '.env' });

type Attachment = {
  content: string;
  filename: string;
  type: string;
  disposition: string;
  content_id: string;
};

export const sendOne = async (
  to: string, subject: string, text: string, html: string, attachments: Attachment[] = []
) => {
  const apiKey = await getSecret('sendgrid_api_key');
  sgMail.setApiKey(apiKey || '');
  const msg = { to, subject, text, html, from: 'bshelor24@gmail.com', attachments };
  try {
    const result = await sgMail.send(msg);
    return result;
  } catch (err: unknown) {
    throw err;
  }
}

/**
 * Send emails to multiple recipients.
 * @param to - array of recipient emails to send
 * @param subject - email subject
 * @param text 
 * @param html - actual html to send
 * @param attachments
 * @param substitutions - object of dynamic values to substitute into each email
 * @returns 
 */
export const sendBatch = async (
  to: string[], subject: string, text: string, html: string, attachments: Attachment[] = [], substitutions: Record<string, string>
) => {
  const apiKey = await getSecret('sendgrid_api_key');
  sgMail.setApiKey(apiKey || '');
  
  const personalizations = to.reduce((acc: { to: string, substitutions: Record<string, string> }[], email: string) => {
    acc.push({
      to: email,
      substitutions: substitutions
    });
    return acc;
  }, []);
  const msg = { subject, text, html, from: 'bshelor24@gmail.com', personalizations, attachments };

  try {
    const [result, ] = await sgMail.send(msg);
    return { statusCode: result.statusCode, body: result.body, messageId: result.headers['x-message-id'] };
  } catch (err: unknown) {
    await sendOne(
      'bshelor24@gmail.com',
      'Data Send Failed',
      'The email batch failed to send. Check lambda logs',
      'The email batch failed to send. Check lambda logs'
    )
    throw err;
  }
}

/**
 * This is a little jerry-rigged, but this method prepares a substitution data object
 * to tack on in personalizations for the email send.
 * 
 * It grabs the top 10 artists from the sorted array to add to the object.
 * @param artists 
 * @returns an object with keys ready to be inserted into the report email
 */
export const prepareTopTenArtistSubstitutionData = (artists: Artist[]) => {
  const fieldMappings = {
    name: 'name',
    popularity: 'popularity',
    genres: 'genres',
    href: 'pageLink',
  }
  const finalObject: Record<string, string> = {};

  for (let i = 0; i < 10; i++) {
    const artist = artists[i];
    Object.keys(fieldMappings).forEach((key: string) => {
      const mappedKey = fieldMappings[key as keyof typeof fieldMappings];

      if (typeof artist[key as keyof typeof artist] !== 'string') {
        finalObject[`${mappedKey}${i + 1}`] = JSON.stringify(artist[key as keyof typeof artist]);
      } else {
        finalObject[`${mappedKey}${i + 1}`] = artist[key as keyof typeof artist] as string;
      }
    });
  }

  return finalObject;
}
