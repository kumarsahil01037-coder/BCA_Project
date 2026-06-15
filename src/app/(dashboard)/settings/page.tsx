import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SenderDetails } from '@/components/settings/sender-details';
import { GmailConnection } from '@/components/settings/gmail-connection';
import { BrevoSenderDetails } from '@/components/settings/brevo-sender';
import { AccountTypes } from '@/components/settings/account-types';
import { FadeIn } from '@/components/motion/fade-in';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/get-user';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser();
  const [sender, gmailAccount, brevoSender, accounts] = await Promise.all([
    prisma.senderAccount.findUnique({
      where: { userId: user.id },
      select: { email: true, name: true, host: true, port: true, connectedAt: true },
    }),
    prisma.gmailAccount.findUnique({
      where: { userId: user.id },
      select: { email: true, connectedAt: true },
    }),
    prisma.brevoSender.findUnique({
      where: { userId: user.id },
      select: { email: true, name: true, verified: true, connectedAt: true },
    }),
    prisma.account.findMany({ where: { userId: user.id }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <FadeIn delay={0}>
        <Suspense>
          <BrevoSenderDetails account={brevoSender} />
        </Suspense>
      </FadeIn>

      <FadeIn delay={0.02}>
        <Suspense>
          <GmailConnection account={gmailAccount} />
        </Suspense>
      </FadeIn>

      <FadeIn delay={0.04}>
        <Suspense>
          <SenderDetails account={sender} />
        </Suspense>
      </FadeIn>

      <FadeIn delay={0.08}>
        <AccountTypes accounts={accounts} />
      </FadeIn>

      <FadeIn delay={0.12}>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Synced from your Clerk account</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input value={user.firstName ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input value={user.lastName ?? ''} disabled />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
