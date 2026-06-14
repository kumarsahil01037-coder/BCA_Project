'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, Clock, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { EmailBatch, EmailLog } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  DRAFT: 'secondary',
  QUEUED: 'secondary',
  SENDING: 'default',
  PARTIAL: 'warning',
  COMPLETED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'secondary',
};

const emailStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'secondary',
  SENDING: 'default',
  SENT: 'success',
  FAILED: 'destructive',
  RETRYING: 'warning',
};

interface Props {
  emailBatch: EmailBatch & { upload: { fileName: string; rowCount: number } | null };
  initialEmails: EmailLog[];
}

interface StatusResp {
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  startedAt: string | null;
  completedAt: string | null;
  live: { pending: number; sending: number; sent: number; failed: number; retrying: number };
}

export function EmailBatchDetail({ emailBatch, initialEmails }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [emails, setEmails] = useState<EmailLog[]>(initialEmails);

  // Keep email rows in sync when server refresh fires (e.g. after polling
  // detects a terminal status and we call router.refresh()).
  useEffect(() => {
    setEmails(initialEmails);
  }, [initialEmails]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [isRetrying, startRetry] = useTransition();

  const isActive = status?.status === 'SENDING' || status?.status === 'QUEUED' || emailBatch.status === 'SENDING' || emailBatch.status === 'QUEUED';

  // Poll status while active. When it transitions to a terminal state,
  // do one last full page refresh to pick up the final EmailLog rows.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wasActive = isActive;

    const tick = async () => {
      try {
        const res = await fetch(`/api/emails/status?id=${emailBatch.id}`);
        if (!res.ok) return;
        const data = (await res.json()) as StatusResp;
        if (stopped) return;
        setStatus(data);
        const stillActive = data.status === 'SENDING' || data.status === 'QUEUED';
        if (stillActive) {
          timer = setTimeout(tick, 2500);
        } else if (wasActive) {
          // Just transitioned to terminal — pull final email rows.
          router.refresh();
        }
        wasActive = stillActive;
      } catch {
        // swallow polling errors; next tick will retry
        if (!stopped) timer = setTimeout(tick, 5000);
      }
    };

    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailBatch.id, isActive]);

  const totals = status ?? {
    status: emailBatch.status,
    totalCount: emailBatch.totalCount,
    sentCount: emailBatch.sentCount,
    failedCount: emailBatch.failedCount,
    live: {
      pending: emails.filter((e) => e.status === 'PENDING').length,
      sending: emails.filter((e) => e.status === 'SENDING').length,
      sent: emails.filter((e) => e.status === 'SENT').length,
      failed: emails.filter((e) => e.status === 'FAILED').length,
      retrying: emails.filter((e) => e.status === 'RETRYING').length,
    },
    startedAt: emailBatch.startedAt?.toISOString() ?? null,
    completedAt: emailBatch.completedAt?.toISOString() ?? null,
  };

  const processed = totals.live.sent + totals.live.failed;
  const pct = totals.totalCount > 0 ? Math.round((processed / totals.totalCount) * 100) : 0;

  const filteredEmails = emails.filter((e) => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (q && !e.to.toLowerCase().includes(q.toLowerCase()) && !e.subject.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const handleRetry = () => {
    startRetry(async () => {
      try {
        const res = await fetch('/api/email-batches/retry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailBatchId: emailBatch.id }),
        });
        if (!res.ok) throw new Error('Retry failed');
        toast.success('Retrying failed emails…');
        // Trigger the polling loop to pick up SENDING state, then refresh emails
        setTimeout(() => router.refresh(), 800);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/history" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to history
          </Link>
          <h2 className="text-2xl font-semibold">{emailBatch.name}</h2>
          <p className="text-sm text-muted-foreground truncate">{emailBatch.subject}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>Created {formatDate(emailBatch.createdAt)}</span>
            {emailBatch.upload && <span>· {emailBatch.upload.fileName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[totals.status] ?? 'secondary'} className="text-sm py-1">
            {totals.status}
          </Badge>
          {totals.failedCount > 0 && !isActive && (
            <Button onClick={handleRetry} disabled={isRetrying} variant="outline">
              {isRetrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Retry {totals.failedCount} failed
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
          <CardDescription>
            {processed} of {totals.totalCount} processed{isActive && ' · live'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pct} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={CheckCircle2} label="Sent" value={totals.live.sent} tone="success" />
            <Stat icon={XCircle} label="Failed" value={totals.live.failed} tone="error" />
            <Stat icon={Clock} label="Pending" value={totals.live.pending + totals.live.retrying} tone="muted" />
            <Stat icon={Loader2} label="In flight" value={totals.live.sending} tone="primary" spin={totals.live.sending > 0} />
          </div>
        </CardContent>
      </Card>

      {/* Recipients table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setFilter}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="all">All ({emails.length})</TabsTrigger>
                <TabsTrigger value="SENT">Sent ({totals.live.sent})</TabsTrigger>
                <TabsTrigger value="FAILED">Failed ({totals.live.failed})</TabsTrigger>
                <TabsTrigger value="PENDING">Pending ({totals.live.pending})</TabsTrigger>
              </TabsList>
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search recipients…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
              </div>
            </div>
            <TabsContent value={filter}>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>To</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Sent at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmails.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                          No recipients match.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredEmails.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.to}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{e.subject}</TableCell>
                        <TableCell>
                          <Badge variant={emailStatusVariant[e.status] ?? 'secondary'}>{e.status}</Badge>
                          {e.errorMessage && (
                            <div className="text-xs text-destructive mt-1 max-w-xs truncate" title={e.errorMessage}>
                              {e.errorMessage}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{e.attempts}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {e.sentAt ? formatDate(e.sentAt) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
  spin,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: 'success' | 'error' | 'muted' | 'primary';
  spin?: boolean;
}) {
  const toneClass = {
    success: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400',
    error: 'text-destructive bg-destructive/10',
    muted: 'text-muted-foreground bg-muted',
    primary: 'text-primary bg-primary/10',
  }[tone];
  return (
    <div className="rounded-md border bg-card p-3 flex items-center gap-3">
      <div className={`grid h-9 w-9 place-items-center rounded-md ${toneClass}`}>
        <Icon className={`h-4 w-4 ${spin ? 'animate-spin' : ''}`} />
      </div>
      <div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
