import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { getAuthorizedClient } from './oauth';

export interface AttachmentInput {
  filename: string;
  content?: Buffer | string;     // base64 or buffer
  path?: string;                 // remote URL or local path (will be fetched)
  contentType?: string;
}

export interface SendArgs {
  userId: string;
  from: string;
  fromName?: string;
  to: string;
  cc?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: AttachmentInput[];
}

/**
 * Builds a RFC-2822 MIME message via nodemailer and uploads it to the
 * Gmail API users.messages.send endpoint.  Using Gmail API (vs SMTP) lets
 * us reuse the OAuth refresh-token flow without app passwords.
 */
export async function sendViaGmail(args: SendArgs): Promise<{ messageId: string }> {
  const auth = await getAuthorizedClient(args.userId);
  const gmail = google.gmail({ version: 'v1', auth });

  // Use a streaming transport to compile the MIME envelope.
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });

  const message = await transport.sendMail({
    from: args.fromName ? `"${args.fromName}" <${args.from}>` : args.from,
    to: args.to,
    cc: args.cc || undefined,
    subject: args.subject,
    html: args.html,
    text: args.text || stripHtml(args.html),
    attachments: args.attachments,
  });

  const raw = Buffer.from(message.message as Buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return { messageId: res.data.id || '' };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
