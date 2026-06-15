import type { Transporter } from 'nodemailer';
import { prisma } from '@/lib/db/prisma';
import type { AttachmentInput } from '@/lib/gmail/sender';
import { sendViaGmail } from '@/lib/gmail/sender';
import { sendViaSmtp, createSmtpTransport } from '@/lib/email/smtp-sender';
import { sendViaBrevo } from '@/lib/email/brevo-sender';
import { renderEmail } from '@/lib/email/template-engine';
import { sleep } from '@/lib/utils';
import { EmailBatchStatus, EmailStatus, type EmailBatch, type EmailLog, type SenderAccount, type BrevoSender } from '@prisma/client';

const SEND_DELAY_MS = parseInt(process.env.EMAIL_SEND_DELAY_MS ?? '300', 10);
const CONCURRENCY = 5;
const MAX_ATTEMPTS = 3;

/**
 * Materialize an email batch: read its upload, render every row into an EmailLog
 * row in PENDING state.  Idempotent — if logs already exist, returns them.
 */
export async function materializeEmailBatch(emailBatchId: string) {
  const emailBatch = await prisma.emailBatch.findUnique({
    where: { id: emailBatchId },
    include: { upload: true, emails: { take: 1 } },
  });
  if (!emailBatch) throw new Error('Email batch not found');
  if (emailBatch.emails.length > 0) return emailBatch; // already materialized
  if (!emailBatch.upload) throw new Error('Email batch has no associated upload');

  const rows = emailBatch.upload.rowsJson as Record<string, unknown>[];
  if (!Array.isArray(rows)) throw new Error('Upload rowsJson is malformed');

  const logs = rows.map((row) => {
    const rendered = renderEmail({
      toTemplate: emailBatch.toField,
      ccTemplate: emailBatch.ccField,
      subjectTemplate: emailBatch.subject,
      bodyHtmlTemplate: emailBatch.bodyHtml,
      dynamicAttachmentCol: emailBatch.dynamicAttachmentCol,
      row,
    });
    const attachments = [
      ...((emailBatch.fixedAttachments as unknown[]) ?? []),
      ...(rendered.attachmentPath ? [{ name: rendered.attachmentPath, dynamic: true, path: rendered.attachmentPath }] : []),
    ];
    return {
      emailBatchId,
      to: rendered.to,
      cc: rendered.cc,
      subject: rendered.subject,
      bodyHtml: rendered.bodyHtml,
      rowData: row as object,
      attachments: attachments as object,
      status: EmailStatus.PENDING as EmailStatus,
    };
  });

  await prisma.$transaction([
    prisma.emailLog.createMany({ data: logs }),
    prisma.emailBatch.update({
      where: { id: emailBatchId },
      data: { totalCount: logs.length, status: EmailBatchStatus.QUEUED },
    }),
  ]);

  return prisma.emailBatch.findUnique({ where: { id: emailBatchId } });
}

/**
 * Process an email batch end-to-end. Designed to be safely callable in a
 * fire-and-forget pattern from an API route.
 */
export async function runEmailBatch(emailBatchId: string) {
  const emailBatch = await prisma.emailBatch.findUnique({ where: { id: emailBatchId } });
  if (!emailBatch) throw new Error('Email batch not found');

  await prisma.emailBatch.update({
    where: { id: emailBatchId },
    data: { status: EmailBatchStatus.SENDING, startedAt: new Date() },
  });

  const pending = await prisma.emailLog.findMany({
    where: { emailBatchId, status: { in: [EmailStatus.PENDING, EmailStatus.RETRYING] } },
    orderBy: { createdAt: 'asc' },
  });

  try {
    const [gmailAccount, brevoSender] = await Promise.all([
      prisma.gmailAccount.findUnique({ where: { userId: emailBatch.userId } }),
      prisma.brevoSender.findUnique({ where: { userId: emailBatch.userId } }),
    ]);
    const sender: Sender = gmailAccount
      ? { type: 'gmail' }
      : brevoSender?.verified
        ? { type: 'brevo', account: brevoSender }
        : { type: 'smtp', ...(await createSmtpTransport(emailBatch.userId)) };

    try {
      for (let i = 0; i < pending.length; i += CONCURRENCY) {
        const chunk = pending.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map((log) => processOneEmail(log, emailBatch, sender)));
        if (i + CONCURRENCY < pending.length) await sleep(SEND_DELAY_MS);
      }
    } finally {
      if (sender.type === 'smtp') sender.transport.close();
    }
  } catch (err) {
    // Couldn't even start sending (e.g. no sender account configured, or
    // SMTP connection failed) — fail the whole batch instead of leaving it
    // stuck in SENDING forever.
    const message = err instanceof Error ? err.message : 'Failed to send batch';
    await prisma.emailBatch.update({
      where: { id: emailBatchId },
      data: { status: EmailBatchStatus.FAILED, completedAt: new Date() },
    });
    await prisma.emailLog.updateMany({
      where: { emailBatchId, status: { in: [EmailStatus.PENDING, EmailStatus.RETRYING, EmailStatus.SENDING] } },
      data: { status: EmailStatus.FAILED, errorMessage: message },
    });
    return;
  }

  // Finalize status
  const counts = await prisma.emailLog.groupBy({
    by: ['status'],
    where: { emailBatchId },
    _count: true,
  });
  const sent = counts.find((c) => c.status === EmailStatus.SENT)?._count ?? 0;
  const failed = counts.find((c) => c.status === EmailStatus.FAILED)?._count ?? 0;
  const finalStatus =
    failed === 0
      ? EmailBatchStatus.COMPLETED
      : sent === 0
        ? EmailBatchStatus.FAILED
        : EmailBatchStatus.PARTIAL;

  await prisma.emailBatch.update({
    where: { id: emailBatchId },
    data: {
      status: finalStatus,
      sentCount: sent,
      failedCount: failed,
      completedAt: new Date(),
    },
  });
}

type Sender =
  | { type: 'gmail' }
  | { type: 'brevo'; account: BrevoSender }
  | { type: 'smtp'; transport: Transporter; account: SenderAccount };

async function processOneEmail(
  log: EmailLog,
  emailBatch: EmailBatch,
  sender: Sender,
) {
  const emailId = log.id;

  const updated = await prisma.emailLog.update({
    where: { id: emailId },
    data: { status: EmailStatus.SENDING, attempts: { increment: 1 } },
  });

  try {
    if (!log.to || log.to.trim() === '') throw new Error('Empty recipient');

    const attachments = await resolveAttachments(log.attachments as unknown[]);

    const sendArgs = {
      userId: emailBatch.userId,
      from: emailBatch.fromEmail,
      fromName: emailBatch.fromName ?? undefined,
      to: log.to,
      cc: log.cc ?? undefined,
      subject: log.subject,
      html: log.bodyHtml,
      attachments,
    };

    const { messageId } =
      sender.type === 'gmail'
        ? await sendViaGmail(sendArgs)
        : sender.type === 'brevo'
          ? await sendViaBrevo({ ...sendArgs, senderEmail: sender.account.email, senderName: sender.account.name })
          : await sendViaSmtp(sendArgs, sender.transport, sender.account);

    await prisma.emailLog.update({
      where: { id: emailId },
      data: {
        status: EmailStatus.SENT,
        messageId,
        sentAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const shouldRetry = updated.attempts < MAX_ATTEMPTS;
    await prisma.emailLog.update({
      where: { id: emailId },
      data: {
        status: shouldRetry ? EmailStatus.RETRYING : EmailStatus.FAILED,
        errorMessage: message,
      },
    });
  }
}

async function resolveAttachments(items: unknown[]): Promise<AttachmentInput[]> {
  if (!Array.isArray(items)) return [];
  const out: AttachmentInput[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const a = raw as Record<string, unknown>;

    // base64-embedded (fixed attachments uploaded by user)
    if (typeof a.base64 === 'string' && a.base64) {
      out.push({
        filename: String(a.name ?? 'attachment'),
        content: Buffer.from(a.base64, 'base64'),
        contentType: typeof a.mime === 'string' ? a.mime : undefined,
      });
      continue;
    }

    // URL or local path (fixed or dynamic)
    const path = typeof a.path === 'string' ? a.path : typeof a.url === 'string' ? a.url : null;
    if (path) {
      try {
        if (/^https?:\/\//i.test(path)) {
          const res = await fetch(path);
          if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          out.push({
            filename: filenameFromPath(path, a.name as string | undefined),
            content: buf,
            contentType: res.headers.get('content-type') || undefined,
          });
        } else {
          // local path — nodemailer will read it
          out.push({
            filename: filenameFromPath(path, a.name as string | undefined),
            path,
          });
        }
      } catch (e) {
        // attachment failures shouldn't kill the whole send — log and continue
        console.error('Attachment resolve failed:', e);
      }
    }
  }
  return out;
}

function filenameFromPath(p: string, fallback?: string): string {
  if (fallback && fallback.trim()) return fallback;
  try {
    const u = new URL(p);
    return u.pathname.split('/').pop() || 'attachment';
  } catch {
    return p.split(/[\\/]/).pop() || 'attachment';
  }
}

/** Re-queue failed emails for an email batch */
export async function retryFailedEmails(emailBatchId: string) {
  await prisma.emailLog.updateMany({
    where: { emailBatchId, status: EmailStatus.FAILED },
    data: { status: EmailStatus.RETRYING, attempts: 0, errorMessage: null },
  });
  await prisma.emailBatch.update({
    where: { id: emailBatchId },
    data: { status: EmailBatchStatus.QUEUED, completedAt: null },
  });
  return runEmailBatch(emailBatchId);
}
