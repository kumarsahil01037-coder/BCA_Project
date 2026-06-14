import { notFound } from 'next/navigation';
import { EmailBatchDetail } from '@/components/history/email-batch-detail';
import { getEmailBatch, getEmailBatchEmails } from '@/server/actions/email-batches';

export const dynamic = 'force-dynamic';

export default async function EmailBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const emailBatch = await getEmailBatch(id);
  if (!emailBatch) notFound();
  const emails = await getEmailBatchEmails(id);
  return <EmailBatchDetail emailBatch={emailBatch} initialEmails={emails} />;
}
