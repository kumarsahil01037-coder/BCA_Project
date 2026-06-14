'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MailWarning, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface StatusResponse {
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  live: { pending: number; sending: number; sent: number; failed: number; retrying: number };
}

const TERMINAL_STATUSES = new Set(['COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED']);

export function SendProgressDialog({
  emailBatchId,
  open,
  onViewDetails,
}: {
  emailBatchId: string | null;
  open: boolean;
  onViewDetails: () => void;
}) {
  const [data, setData] = useState<StatusResponse | null>(null);

  useEffect(() => {
    if (!open || !emailBatchId) {
      setData(null);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/emails/status?id=${emailBatchId}`);
        if (!res.ok) return;
        const json = (await res.json()) as StatusResponse;
        if (!cancelled) setData(json);
      } catch {
        // ignore transient errors, keep polling
      }
    };

    poll();
    const interval = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, emailBatchId]);

  const total = data?.totalCount ?? 0;
  const sent = data?.sentCount ?? 0;
  const failed = data?.failedCount ?? 0;
  const done = sent + failed;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isDone = data ? TERMINAL_STATUSES.has(data.status) : false;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md text-center [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            {isDone ? (
              failed > 0 && sent === 0 ? (
                <MailWarning className="h-7 w-7" />
              ) : (
                <CheckCircle2 className="h-7 w-7" />
              )
            ) : (
              <Send className="h-7 w-7 animate-pulse" />
            )}
          </div>
          <DialogTitle className="text-xl">
            {isDone ? 'Email sent!' : 'Sending your email…'}
          </DialogTitle>
          <DialogDescription>
            {isDone
              ? `${sent} of ${total} emails sent successfully${failed > 0 ? `, ${failed} failed` : ''}.`
              : 'Hang tight — emails are being sent one by one to avoid Gmail rate limits.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Progress value={total > 0 ? pct : isDone ? 100 : 5} className="h-3" />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {!isDone && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span className="tabular-nums">
              {done} / {total} processed
            </span>
            {failed > 0 && <span className="text-destructive">· {failed} failed</span>}
          </div>
        </div>

        {isDone && (
          <DialogFooter className="sm:justify-center">
            <Button onClick={onViewDetails} className="w-full sm:w-auto">
              View details
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
