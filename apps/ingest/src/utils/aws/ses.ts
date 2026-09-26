import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { Artist } from '../../rankArtists.js';

const ses = new SESv2Client({ region: 'us-east-1' });
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'bshelor24@gmail.com';

type Attachment = {
  content: string;
  filename: string;
  type: string;
  disposition: string;
  content_id: string;
};

function renderTemplate(template: string, substitutions: Record<string, string>) {
  return template.replaceAll(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => substitutions[key] ?? '');
}

function foldBase64(value: string) {
  return value.replaceAll(/.{1,76}/g, '$&\r\n').trimEnd();
}

function safeHeaderValue(value: string) {
  return value.replaceAll(/[\r\n]/g, ' ');
}

function buildRawMessage(
  to: string[],
  subject: string,
  text: string,
  html: string,
  attachments: Attachment[],
) {
  const mixedBoundary = `mixed-${Date.now()}`;
  const alternativeBoundary = `alternative-${Date.now()}`;
  const lines = [
    `From: ${safeHeaderValue(FROM_EMAIL)}`,
    `To: ${to.map(safeHeaderValue).join(', ')}`,
    `Subject: ${safeHeaderValue(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    '',
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    '',
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    text,
    '',
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
    '',
    `--${alternativeBoundary}--`,
  ];

  for (const attachment of attachments) {
    lines.push(
      '',
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.type}; name="${safeHeaderValue(attachment.filename)}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: ${attachment.disposition}; filename="${safeHeaderValue(attachment.filename)}"`,
      `Content-ID: <${safeHeaderValue(attachment.content_id)}>`,
      '',
      foldBase64(attachment.content),
    );
  }

  lines.push('', `--${mixedBoundary}--`, '');
  return lines.join('\r\n');
}

export const sendOne = async (
  to: string,
  subject: string,
  text: string,
  html: string,
  attachments: Attachment[] = [],
) => sendBatch([to], subject, text, html, attachments, {});

export const sendBatch = async (
  to: string[],
  subject: string,
  text: string,
  html: string,
  attachments: Attachment[] = [],
  substitutions: Record<string, string>,
) => {
  const renderedText = renderTemplate(text, substitutions);
  const renderedHtml = renderTemplate(html, substitutions);
  const rawMessage = buildRawMessage(to, subject, renderedText, renderedHtml, attachments);
  const result = await ses.send(
    new SendEmailCommand({
      FromEmailAddress: FROM_EMAIL,
      Destination: {
        ToAddresses: to,
      },
      Content: {
        Raw: {
          Data: Buffer.from(rawMessage),
        },
      },
    }),
  );

  return { statusCode: 200, body: {}, messageId: result.MessageId };
};

export const prepareTopTenArtistSubstitutionData = (artists: Artist[]) => {
  const fieldMappings = {
    name: 'name',
    popularity: 'popularity',
    genres: 'genres',
    href: 'pageLink',
  };
  const finalObject: Record<string, string> = {};

  for (let i = 0; i < 10; i++) {
    const artist = artists[i];
    if (!artist) break;
    Object.keys(fieldMappings).forEach((key: string) => {
      const mappedKey = fieldMappings[key as keyof typeof fieldMappings];
      const value = artist[key as keyof typeof artist];
      finalObject[`${mappedKey}${i + 1}`] =
        typeof value === 'string' ? value : JSON.stringify(value);
    });
  }

  return finalObject;
};
