'use client';
import { useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, CheckCircle2, AlertCircle, Loader2, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface Props {
  account: { email: string; connectedAt: Date } | null;
}

export function GmailConnection({ account }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Handle redirect feedback from /api/gmail/callback
  useEffect(() => {
    const gmail = params.get('gmail');
    const reason = params.get('reason');
    if (gmail === 'connected') {
      toast.success('Gmail connected successfully');
      router.replace('/settings');
    } else if (gmail === 'error') {
      const msg =
        reason === 'no_refresh_token'
          ? 'Missing refresh token. Revoke app access in your Google Account and try again.'
          : reason === 'bad_state'
            ? 'Authentication state mismatch'
            : 'Could not connect Gmail';
      toast.error(msg);
      router.replace('/settings');
    }
  }, [params, router]);

  const handleConnect = () => {
    window.location.href = '/api/gmail/auth';
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/gmail/disconnect', { method: 'POST' });
        if (!res.ok) throw new Error('Failed');
        toast.success('Gmail disconnected');
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
          <Mail className="h-4 w-4" /> Gmail
        </CardTitle>
        <CardDescription>
          Connect your Gmail account so Penarreach can send emails on your behalf using OAuth.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {account ? (
          <div className="flex items-center justify-between gap-4 rounded-md border bg-card p-4 transition-shadow hover:shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{account.email}</span>
                  <Badge variant="success">Connected</Badge>
                </div>
                <div className="text-xs text-muted-foreground">Connected {formatDate(account.connectedAt)}</div>
              </div>
            </div>
            <Button variant="outline" onClick={handleDisconnect} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No Gmail account connected</p>
            <Button onClick={handleConnect} className="mt-4 transition-transform hover:scale-105 active:scale-95">
              <Link2 className="h-4 w-4 mr-2" />
              Connect Gmail
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              You&apos;ll be redirected to Google to authorize the &ldquo;gmail.send&rdquo; scope only.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
