'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, CheckCircle2, Clock, Loader2, Unlink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { connectBrevoSender, disconnectBrevoSender, refreshBrevoSenderStatus, verifyBrevoSenderOtp } from '@/server/actions/brevo-sender';

interface Props {
  account: { email: string; name: string | null; verified: boolean; connectedAt: Date } | null;
}

export function BrevoSenderDetails({ account }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await connectBrevoSender({ email, name: name || undefined });
        toast.success('Verification email sent — check your inbox');
        setEmail('');
        setName('');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to connect');
      }
    });
  };

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const { verified } = await refreshBrevoSenderStatus();
        if (verified) toast.success('Email verified!');
        else toast.info('Not verified yet — check your inbox for the confirmation code');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed');
      }
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await verifyBrevoSenderOtp(otp);
        toast.success('Email verified!');
        setOtp('');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed');
      }
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      try {
        await disconnectBrevoSender();
        toast.success('Sender email removed');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-4 w-4" /> Sender email
        </CardTitle>
        <CardDescription>
          Enter the email address you want to send from. We&apos;ll send a quick verification code —
          enter it below and you can start sending. No passwords or sign-in required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {account ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-md border bg-card p-4 transition-shadow hover:shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-full shrink-0 ${
                    account.verified
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}
                >
                  {account.verified ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{account.email}</span>
                    {account.verified ? (
                      <Badge variant="success">Connected</Badge>
                    ) : (
                      <Badge variant="secondary">Pending verification</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {account.name ? `${account.name} · ` : ''}Added {formatDate(account.connectedAt)}
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={handleDisconnect} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
                Remove
              </Button>
            </div>

            {!account.verified && (
              <form onSubmit={handleVerifyOtp} className="space-y-2 rounded-md border border-dashed p-4">
                <Label htmlFor="brevoOtp">Verification code</Label>
                <p className="text-xs text-muted-foreground">
                  Check {account.email} for an email from Brevo with a 6-digit code, then enter it here.
                </p>
                <div className="flex gap-2">
                  <Input
                    id="brevoOtp"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={isPending}
                    className="max-w-[160px]"
                  />
                  <Button type="submit" disabled={isPending || !otp.trim()}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                  </Button>
                  <Button type="button" variant="outline" onClick={handleRefresh} disabled={isPending}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brevoEmail">Email address</Label>
                <Input
                  id="brevoEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brevoName">Display name (optional)</Label>
                <Input
                  id="brevoName"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <Button type="submit" disabled={isPending} className="transition-transform hover:scale-105 active:scale-95">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
