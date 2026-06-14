import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from '@/lib/db/prisma';
import { decrypt } from '@/lib/auth/crypto';
import type { AttachmentInput, SendArgs } from '@/lib/gmail/sender';

export async function createSmtpTransport(userId: string): Promise<Transporter> {
  const account = await prisma.senderAccount.findUnique({ where: { userId } });
  if (!account) throw new Error('Sender email not configured for this user');

  return nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.port === 465,
    requireTLS: account.port !== 465,
    auth: { user: account.email, pass: decrypt(account.appPassword) },
    pool: true,
    maxConnections: 3,
  });
}

/**
 * Sends via SMTP using the user's own stored credentials (Gmail,
 * Outlook, or any provider's app password), so the email genuinely
 * originates from their address without an OAuth consent flow.
 *
 * Pass a `transport` (from createSmtpTransport) to reuse a single
 * connection across a batch instead of reconnecting per email.
 */
export async function sendViaSmtp(args: SendArgs, transport?: Transporter): Promise<{ messageId: string }> {
  const account = await prisma.senderAccount.findUnique({ where: { userId: args.userId } });
  if (!account) throw new Error('Sender email not configured for this user');

  const t = transport ?? (await createSmtpTransport(args.userId));

  const info = await t.sendMail({
    from: args.fromName ? `"${args.fromName}" <${account.email}>` : account.email,
    to: args.to,
    cc: args.cc || undefined,
    subject: args.subject,
    html: args.html,
    text: args.text,
    attachments: args.attachments as AttachmentInput[] | undefined,
  });

  if (!transport) t.close();

  return { messageId: info.messageId };
}
