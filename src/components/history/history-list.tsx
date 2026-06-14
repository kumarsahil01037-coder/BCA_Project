'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, History as HistoryIcon, Download } from 'lucide-react';
import type { EmailBatch } from '@prisma/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FadeIn } from '@/components/motion/fade-in';
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

export function HistoryList({ emailBatches }: { emailBatches: EmailBatch[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');

  const exportParams = new URLSearchParams();
  if (exportFrom) exportParams.set('from', exportFrom);
  if (exportTo) exportParams.set('to', exportTo);
  exportParams.set('tz', String(new Date().getTimezoneOffset()));
  const exportHref = `/api/emails/export?${exportParams}`;

  const filtered = emailBatches.filter((c) => {
    if (status !== 'all' && c.status !== status) return false;
    if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !c.subject.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <FadeIn>
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="export-from">From</label>
            <Input id="export-from" type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="export-to">To</label>
            <Input id="export-to" type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="w-[160px]" />
          </div>
          <Button asChild variant="secondary">
            <a href={exportHref} download>
              <Download className="h-4 w-4" />
              Download Excel report
            </a>
          </Button>
          <p className="text-xs text-muted-foreground sm:ml-auto">
            Exports every email sent (with status, recipient and subject) in the selected date range. Leave blank for all-time.
          </p>
        </CardContent>
      </Card>
      </FadeIn>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search emails…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="SENDING">Sending</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="QUEUED">Queued</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <HistoryIcon className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No emails match these filters.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {filtered.map((c, i) => {
                  const pct = c.totalCount > 0 ? Math.round((c.sentCount / c.totalCount) * 100) : 0;
                  return (
                    <motion.tr
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03, ease: 'easeOut' }}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                    >
                      <TableCell>
                        <Link href={`/history/${c.id}`} className="block">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{c.subject}</div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[c.status] ?? 'secondary'}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <Progress value={pct} className="h-2" />
                        <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                          {c.sentCount + c.failedCount}/{c.totalCount}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{c.sentCount}</TableCell>
                      <TableCell className="tabular-nums">
                        {c.failedCount > 0 ? <span className="text-destructive">{c.failedCount}</span> : 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
