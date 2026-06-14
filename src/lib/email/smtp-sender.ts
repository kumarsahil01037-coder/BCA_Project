import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from '@/lib/db/prisma';
import { decrypt } from '@/lib/auth/crypto';
import type { AttachmentInput, SendArgs } from '@/lib/gmail/sender';
import type { SenderAccount } from '@prisma/client';

/**
 * Fetch the user's sender account once and build a pooled transport for
 * reuse across an entire batch — avoids a DB round-trip and a fresh TLS
 * handshake per email.
 */
export async function createSmtpTransport(
  userId: string,
): Promise<{ transport: Transporter; account: SenderAccount }> {
  const account = await prisma.senderAccount.findUnique({ where: { userId } });
  if (!account) throw new Error('Sender email not configured for this user');

  const transport = nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.port === 465,
    requireTLS: account.port !== 465,
    auth: { user: account.email, pass: decrypt(account.appPassword) },
    pool: true,
    maxConnections: 5,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return { transport, account };
}

/**
 * Sends via SMTP using the user's own stored credentials (Gmail,
 * Outlook, or any provider's app password), so the email genuinely
 * originates from their address without an OAuth consent flow.
 */
export async function sendViaSmtp(
  args: SendArgs,
  transport: Transporter,
  account: SenderAccount,
): Promise<{ messageId: string }> {
  const info = await transport.sendMail({
    from: args.fromName ? `"${args.fromName}" <${account.email}>` : account.email,
    to: args.to,
    cc: args.cc || undefined,
    subject: args.subject,
    html: args.html,
    text: args.text,
    attachments: args.attachments as AttachmentInput[] | undefined,
  });

  return { messageId: info.messageId };
}
