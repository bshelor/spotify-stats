import sgMail from '@sendgrid/mail';
import { config } from 'dotenv';
import { getSecret } from '../aws/secretsManager';

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

export const sendBatch = async (
  to: string[], subject: string, text: string, html: string, attachments: Attachment[] = []
) => {
  const apiKey = await getSecret('sendgrid_api_key');
  sgMail.setApiKey(apiKey || '');
  const personalizations = to.reduce((acc: { to: string }[], email: string) => {
    acc.push({ to: email });
    return acc;
  }, []);
  const msg = { subject, text, html, from: 'bshelor24@gmail.com', personalizations, attachments };
  try {
    const [result, ] = await sgMail.send(msg);
    console.log("🚀 ~ file: emails.ts:38 ~ result:", result)
    return { statusCode: result.statusCode, body: result.body, messageId: result.headers['x-message-id'] };
  } catch (err: unknown) {
    throw err;
  }
}
