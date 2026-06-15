import Link from 'next/link';
import { Mail, Send, FileText, AlertCircle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/get-user';
import { formatDate, cn } from '@/lib/utils';
import { FadeIn, FadeInStagger, FadeInItem, HoverLift } from '@/components/motion/fade-in';

export const dynamic = 'force-dynamic';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  DRAFT: 'secondary',
  QUEUED: 'secondary',
  SENDING: 'default',
  PARTIAL: 'warning',
  COMPLETED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'secondary',
};

export default async function DashboardPage() {
  const user = await requireUser();

  const [totalEmailBatches, totalSent, totalFailed, gmailAccount, brevoSender, senderAccount, recentEmailBatches, templateCount] = await Promise.all([
    prisma.emailBatch.count({ where: { userId: user.id } }),
    prisma.emailLog.count({ where: { emailBatch: { userId: user.id }, status: 'SENT' } }),
    prisma.emailLog.count({ where: { emailBatch: { userId: user.id }, status: 'FAILED' } }),
    prisma.gmailAccount.findUnique({ where: { userId: user.id }, select: { email: true } }),
    prisma.brevoSender.findUnique({ where: { userId: user.id }, select: { email: true, verified: true } }),
    prisma.senderAccount.findUnique({ where: { userId: user.id }, select: { email: true } }),
    prisma.emailBatch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.template.count({ where: { userId: user.id } }),
  ]);

  const sender = gmailAccount ?? (brevoSender?.verified ? brevoSender : null) ?? senderAccount;

  const stats = [
    { label: 'Emails', value: totalEmailBatches, icon: Send },
    { label: 'Emails sent', value: totalSent, icon: CheckCircle2 },
    { label: 'Failed', value: totalFailed, icon: AlertCircle },
    { label: 'Templates', value: templateCount, icon: FileText },
  ];

  const deliveryRate =
    totalSent + totalFailed > 0 ? Math.round((totalSent / (totalSent + totalFailed)) * 100) : 100;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <FadeIn>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="rounded-2xl border bg-card p-6 md:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {sender ? 'Ready to send' : 'Setup needed'}
          </div>
          <h2 className="font-display text-3xl font-medium tracking-tight md:text-5xl">
            Welcome back
            {user.firstName ? (
              <>
                , <span className="italic text-primary">{user.firstName}</span>
              </>
            ) : (
              ''
            )}
            .
          </h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            {sender
              ? <>Sending from <span className="font-medium text-foreground">{sender.email}</span></>
              : 'Add your sender email to start sending emails.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {!sender && (
              <Link href="/settings">
                <Button variant="secondary" size="lg" className="transition-transform hover:scale-105 active:scale-95">
                  <Mail className="mr-2 h-4 w-4" /> Add sender email
                </Button>
              </Link>
            )}
            <Link href="/compose">
              <Button size="lg" className="transition-transform hover:scale-105 active:scale-95">
                <Send className="mr-2 h-4 w-4" /> New email
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-sunset" /> Delivery rate
              </div>
              <div className="font-display text-4xl font-medium text-sunset">{deliveryRate}%</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Of {(totalSent + totalFailed).toLocaleString()} emails sent so far, {totalSent.toLocaleString()} were delivered successfully.
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-ink text-ink-foreground">
            <CardContent className="p-6">
              <p className="font-display text-lg italic leading-snug">
                &quot;Personalised, on-brand email — sent straight from your own inbox.&quot;
              </p>
              <p className="mt-3 text-sm text-ink-foreground/60">— Penarreach</p>
            </CardContent>
          </Card>
        </div>
      </div>
      </FadeIn>

      {/* Stats */}
      <FadeInStagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <FadeInItem key={s.label}>
            <HoverLift>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-6">
                  <div
                    className={cn(
                      'grid h-11 w-11 place-items-center rounded-full',
                      i % 2 === 0 ? 'bg-primary/10 text-primary' : 'bg-sunset/10 text-sunset',
                    )}
                  >
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-2xl font-medium">{s.value.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            </HoverLift>
          </FadeInItem>
        ))}
      </FadeInStagger>

      {/* Recent emails */}
      <FadeIn delay={0.15}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent emails</CardTitle>
            <CardDescription>Your last 5 sends</CardDescription>
          </div>
          <Link href="/history">
            <Button variant="ghost" size="sm">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentEmailBatches.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No emails yet.{' '}
              <Link href="/compose" className="text-primary hover:underline">
                Create your first one
              </Link>
              .
            </div>
          ) : (
            <div className="divide-y">
              {recentEmailBatches.map((c) => (
                <Link
                  key={c.id}
                  href={`/history/${c.id}`}
                  className="flex items-center justify-between py-3 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {c.sentCount}/{c.totalCount}
                    </span>
                    <Badge variant={statusVariant[c.status] ?? 'secondary'}>
                      {c.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </FadeIn>
    </div>
  );
}
