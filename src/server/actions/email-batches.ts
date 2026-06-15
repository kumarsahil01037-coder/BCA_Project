'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/get-user';
import { composeSchema, type ComposeInput } from '@/lib/validators/schemas';
import { renderEmail } from '@/lib/email/template-engine';
import { materializeEmailBatch } from '@/server/services/email-batch-processor';

export async function previewEmail(input: ComposeInput, sampleSize = 3) {
  const user = await requireUser();
  const data = composeSchema.parse(input);

  const upload = await prisma.excelUpload.findFirst({
    where: { id: data.uploadId, userId: user.id },
  });
  if (!upload) throw new Error('Upload not found');

  const rows = upload.rowsJson as Record<string, unknown>[];
  const samples = rows.slice(0, sampleSize).map((row) =>
    renderEmail({
      toTemplate: data.toField,
      ccTemplate: data.ccField,
      subjectTemplate: data.subject,
      bodyHtmlTemplate: data.bodyHtml,
      dynamicAttachmentCol: data.dynamicAttachmentCol,
      row,
    }),
  );

  const totalMissing = new Set<string>();
  for (const s of samples) s.missingVariables.forEach((v) => totalMissing.add(v));

  return {
    totalRecipients: rows.length,
    samples,
    missingVariables: [...totalMissing],
    availableColumns: upload.columns,
  };
}

export async function createAndQueueEmailBatch(input: ComposeInput) {
  const user = await requireUser();
  const data = composeSchema.parse(input);

  // Require a connected sender (Gmail OAuth or SMTP app password)
  const [gmailAccount, senderAccount] = await Promise.all([
    prisma.gmailAccount.findUnique({ where: { userId: user.id } }),
    prisma.senderAccount.findUnique({ where: { userId: user.id } }),
  ]);
  if (!gmailAccount && !senderAccount) {
    throw new Error('Connect your sender email in Settings before sending');
  }

  const upload = await prisma.excelUpload.findFirst({
    where: { id: data.uploadId, userId: user.id },
  });
  if (!upload) throw new Error('Upload not found');

  const emailBatch = await prisma.emailBatch.create({
    data: {
      userId: user.id,
      uploadId: upload.id,
      name: data.name,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      toField: data.toField,
      ccField: data.ccField ?? null,
      fromEmail: data.fromEmail,
      fromName: data.fromName ?? null,
      fixedAttachments: data.fixedAttachments as object,
      dynamicAttachmentCol: data.dynamicAttachmentCol ?? null,
    },
  });

  await materializeEmailBatch(emailBatch.id);
  revalidatePath('/history');
  return { emailBatchId: emailBatch.id };
}

export async function getEmailBatch(id: string) {
  const user = await requireUser();
  return prisma.emailBatch.findFirst({
    where: { id, userId: user.id },
    include: {
      _count: { select: { emails: true } },
      upload: { select: { fileName: true, rowCount: true } },
    },
  });
}

export async function listEmailBatches(opts: { search?: string; status?: string } = {}) {
  const user = await requireUser();
  return prisma.emailBatch.findMany({
    where: {
      userId: user.id,
      ...(opts.search ? { name: { contains: opts.search, mode: 'insensitive' } } : {}),
      ...(opts.status && opts.status !== 'all' ? { status: opts.status as never } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function getEmailBatchEmails(id: string, opts: { search?: string; status?: string } = {}) {
  const user = await requireUser();
  const emailBatch = await prisma.emailBatch.findFirst({ where: { id, userId: user.id } });
  if (!emailBatch) return [];
  return prisma.emailLog.findMany({
    where: {
      emailBatchId: id,
      ...(opts.search ? { to: { contains: opts.search, mode: 'insensitive' } } : {}),
      ...(opts.status && opts.status !== 'all' ? { status: opts.status as never } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });
}
