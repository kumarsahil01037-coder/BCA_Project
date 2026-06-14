import { TemplatesList } from '@/components/templates/templates-list';
import { listTemplates } from '@/server/actions/templates';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return <TemplatesList initial={templates} />;
}
