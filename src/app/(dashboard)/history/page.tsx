import { HistoryList } from '@/components/history/history-list';
import { listEmailBatches } from '@/server/actions/email-batches';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const emailBatches = await listEmailBatches();
  return <HistoryList emailBatches={emailBatches} />;
}
