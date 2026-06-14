'use client';
import { useState } from 'react';
import { AlertTriangle, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { RenderedEmail } from '@/lib/email/template-engine';

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  samples: RenderedEmail[];
  totalRecipients: number;
  missingVariables: string[];
}

export function PreviewDialog({ open, onOpenChange, samples, totalRecipients, missingVariables }: PreviewDialogProps) {
  const [i, setI] = useState(0);
  const current = samples[i];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Preview
          </DialogTitle>
          <DialogDescription>
            Showing {samples.length} sample{samples.length === 1 ? '' : 's'} of {totalRecipients} recipient
            {totalRecipients === 1 ? '' : 's'}
          </DialogDescription>
        </DialogHeader>

        {missingVariables.length > 0 && (
          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <div className="font-medium text-amber-900 dark:text-amber-200">Unmapped variables</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {missingVariables.map((v) => (
                  <Badge key={v} variant="warning">{`<<${v}>>`}</Badge>
                ))}
              </div>
              <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                These will be replaced with empty strings.
              </div>
            </div>
          </div>
        )}

        {current && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <PreviewRow label="To" value={current.to || <span className="text-destructive">(empty)</span>} />
            {current.cc && <PreviewRow label="Cc" value={current.cc} />}
            <PreviewRow label="Subject" value={<span className="font-medium">{current.subject}</span>} />
            {current.attachmentPath && (
              <PreviewRow label="Attachment" value={<code className="text-xs">{current.attachmentPath}</code>} />
            )}
            <div className="rounded-md border bg-card p-4">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: current.bodyHtml }}
              />
            </div>
          </div>
        )}

        {samples.length > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setI((p) => Math.max(0, p - 1))}
              disabled={i === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Sample {i + 1} of {samples.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setI((p) => Math.min(samples.length - 1, p + 1))}
              disabled={i === samples.length - 1}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="break-words">{value}</div>
    </div>
  );
}
