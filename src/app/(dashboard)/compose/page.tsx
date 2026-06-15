import { ComposeForm } from '@/components/compose/compose-form';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/get-user';

export const dynamic = 'force-dynamic';

export default async function ComposePage() {
  const user = await requireUser();
  const [gmailAccount, brevoSender, sender, templates, accounts] = await Promise.all([
    prisma.gmailAccount.findUnique({ where: { userId: user.id }, select: { email: true } }),
    prisma.brevoSender.findUnique({ where: { userId: user.id }, select: { email: true, verified: true } }),
    prisma.senderAccount.findUnique({ where: { userId: user.id }, select: { email: true } }),
    prisma.template.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, subject: true, bodyHtml: true, toField: true, ccField: true },
    }),
    prisma.account.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          New email
        </div>
        <h2 className="font-display text-2xl font-medium tracking-tight md:text-4xl">
          Compose a <span className="italic text-primary">personalised</span> email.
        </h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Upload your recipient list, write your email once, and Penarreach fills in the details for every contact.
        </p>
      </div>
      <ComposeForm
        fromEmail={gmailAccount?.email ?? (brevoSender?.verified ? brevoSender.email : null) ?? sender?.email ?? null}
        fromName={[user.firstName, user.lastName].filter(Boolean).join(' ') || null}
        templates={templates.map((t) => ({ ...t, toField: t.toField ?? '<<Email>>' }))}
        accounts={accounts}
      />
    </div>
  );
}
