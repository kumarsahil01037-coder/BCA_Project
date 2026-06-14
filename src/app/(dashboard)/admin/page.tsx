import { redirect } from 'next/navigation';
import { AccessManager } from '@/components/admin/access-manager';
import { FadeIn } from '@/components/motion/fade-in';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/get-user';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const entries = await prisma.allowedEmail.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div className="max-w-3xl space-y-6">
      <FadeIn delay={0}>
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Admin
          </div>
          <h2 className="font-display text-2xl font-medium tracking-tight md:text-4xl">
            Manage <span className="italic text-primary">access</span>.
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Grant or revoke access for individual email addresses. Only people listed below — or other admins —
            can sign in and use Penarreach.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <AccessManager entries={entries} />
      </FadeIn>
    </div>
  );
}
