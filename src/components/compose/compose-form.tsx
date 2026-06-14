'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Eye, Paperclip, X, Loader2, FileText } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-in';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExcelUploader, type UploadResult } from './excel-uploader';
import { RichEditor } from './rich-editor';
import { PreviewDialog } from './preview-dialog';
import { SendProgressDialog } from './send-progress-dialog';
import { composeSchema, type ComposeInput } from '@/lib/validators/schemas';
import { previewEmail, createAndQueueEmailBatch } from '@/server/actions/email-batches';
import { extractAllVariables, type RenderedEmail } from '@/lib/email/template-engine';
import { formatBytes } from '@/lib/utils';

interface ComposeFormProps {
  fromEmail: string | null;
  fromName: string | null;
  templates: { id: string; name: string; subject: string; bodyHtml: string; toField: string; ccField: string | null }[];
  accounts: { id: string; name: string }[];
}

interface FixedAttachment {
  name: string;
  base64: string;
  mime: string;
  size: number;
}

export function ComposeForm({ fromEmail, fromName, templates, accounts }: ComposeFormProps) {
  const router = useRouter();
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [attachments, setAttachments] = useState<FixedAttachment[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    samples: RenderedEmail[];
    totalRecipients: number;
    missingVariables: string[];
  } | null>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [isSending, startSend] = useTransition();
  const [sendingEmailBatchId, setSendingEmailBatchId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ComposeInput>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      name: '',
      uploadId: '',
      toField: '<<Email>>',
      ccField: '',
      subject: '',
      bodyHtml: '',
      fromEmail: fromEmail ?? '',
      fromName: fromName ?? '',
      fixedAttachments: [],
      dynamicAttachmentCol: '',
    },
  });

  const name = watch('name');
  const toField = watch('toField');
  const ccField = watch('ccField');
  const subject = watch('subject');
  const bodyHtml = watch('bodyHtml');
  const dynamicAttachmentCol = watch('dynamicAttachmentCol');

  // Keep uploadId in form synced with upload state
  useEffect(() => {
    setValue('uploadId', upload?.uploadId ?? '');
  }, [upload, setValue]);

  // Used variables in the templates — for warning UI and the editor toolbar
  const usedVariables = useMemo(
    () => extractAllVariables([toField, ccField, subject, bodyHtml]),
    [toField, ccField, subject, bodyHtml],
  );

  // Variables that aren't matched by any column
  const unmappedVariables = useMemo(() => {
    if (!upload) return [];
    const colsLower = new Set(upload.columns.map((c) => c.toLowerCase()));
    return usedVariables.filter((v) => !colsLower.has(v.toLowerCase()));
  }, [usedVariables, upload]);

  const handleTemplateLoad = (templateId: string) => {
    if (templateId === '__none__') return;
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setValue('subject', t.subject);
    setValue('bodyHtml', t.bodyHtml);
    setValue('toField', t.toField);
    setValue('ccField', t.ccField ?? '');
    toast.success(`Loaded "${t.name}"`);
  };

  const handleAttachmentAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const next: FixedAttachment[] = [];
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 10MB attachment limit`);
        continue;
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const idx = dataUrl.indexOf(',');
          resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(f);
      });
      next.push({ name: f.name, base64, mime: f.type || 'application/octet-stream', size: f.size });
    }
    const updated = [...attachments, ...next];
    setAttachments(updated);
    setValue(
      'fixedAttachments',
      updated.map((a) => ({ name: a.name, base64: a.base64, mime: a.mime, size: a.size })),
    );
    e.target.value = '';
  };

  const handleAttachmentRemove = (idx: number) => {
    const updated = attachments.filter((_, i) => i !== idx);
    setAttachments(updated);
    setValue(
      'fixedAttachments',
      updated.map((a) => ({ name: a.name, base64: a.base64, mime: a.mime, size: a.size })),
    );
  };

  const onPreview = handleSubmit((data) => {
    if (!upload) {
      toast.error('Upload a spreadsheet first');
      return;
    }
    startPreview(async () => {
      try {
        const result = await previewEmail(data);
        setPreviewData(result);
        setPreviewOpen(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Preview failed');
      }
    });
  });

  const onSubmit = handleSubmit((data) => {
    if (!upload) {
      toast.error('Upload a spreadsheet first');
      return;
    }
    if (!fromEmail) {
      toast.error('Add your sender email in Settings first');
      return;
    }
    startSend(async () => {
      try {
        const { emailBatchId } = await createAndQueueEmailBatch(data);
        setSendingEmailBatchId(emailBatchId);

        // Kick off the send (fire and forget on server)
        await fetch('/api/emails/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailBatchId }),
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to start email');
      }
    });
  });

  const senderReady = Boolean(fromEmail);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {!senderReady && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="font-medium text-amber-900 dark:text-amber-200">Sender email not set</div>
          <div className="text-amber-700 dark:text-amber-300">
            Go to{' '}
            <a href="/settings" className="underline">
              Settings
            </a>{' '}
            and add your sender email before sending.
          </div>
        </div>
      )}

      {/* Top row: account type + template loader */}
      <FadeIn delay={0}>
      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_240px]">
          <div className="space-y-2">
            <Label htmlFor="name">Account Type</Label>
            {accounts.length > 0 ? (
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="name">
                      <SelectValue placeholder="Select an account type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.name}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <>
                <Input id="name" placeholder="e.g. Q3 Dealer Outreach" {...register('name')} />
                <p className="text-xs text-muted-foreground">
                  Add account types in{' '}
                  <a href="/settings" className="underline">
                    Settings
                  </a>{' '}
                  to pick from a dropdown here.
                </p>
              </>
            )}
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>Load from template</Label>
              <Select onValueChange={handleTemplateLoad}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
      </FadeIn>

      {/* Recipients */}
      {name && (
      <FadeIn delay={0.05}>
      <Card>
        <CardHeader>
          <CardTitle>1. Recipients</CardTitle>
          <CardDescription>Upload a spreadsheet of contacts. Each column becomes a variable.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExcelUploader value={upload} onChange={setUpload} />
          {errors.uploadId && <p className="mt-2 text-xs text-destructive">{errors.uploadId.message}</p>}
        </CardContent>
      </Card>
      </FadeIn>
      )}

      {/* Email */}
      <FadeIn delay={0.1}>
      <Card>
        <CardHeader>
          <CardTitle>2. Email</CardTitle>
          <CardDescription>
            Use <code className="rounded bg-muted px-1.5 py-0.5 text-xs">&lt;&lt;ColumnName&gt;&gt;</code> in any field
            to personalize.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fromName">From name</Label>
              <Input id="fromName" placeholder="Your Name" {...register('fromName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From email</Label>
              <Input id="fromEmail" placeholder="you@gmail.com" disabled {...register('fromEmail')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="toField">To</Label>
            <Input id="toField" placeholder="<<Email>>" {...register('toField')} />
            {errors.toField && <p className="text-xs text-destructive">{errors.toField.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ccField">Cc (optional)</Label>
            <Input id="ccField" placeholder="<<Manager>>, ops@example.com" {...register('ccField')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" placeholder="Hi <<FirstName>>, quick question" {...register('subject')} />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Controller
              name="bodyHtml"
              control={control}
              render={({ field }) => (
                <RichEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Write your email…"
                  availableVariables={upload?.columns ?? []}
                />
              )}
            />
            {errors.bodyHtml && <p className="text-xs text-destructive">{errors.bodyHtml.message}</p>}
          </div>

          {/* Variables status */}
          {upload && usedVariables.length > 0 && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <div className="font-medium mb-1.5">Variables used in this email</div>
              <div className="flex flex-wrap gap-1">
                {usedVariables.map((v) => {
                  const mapped = upload.columns.some((c) => c.toLowerCase() === v.toLowerCase());
                  return (
                    <Badge key={v} variant={mapped ? 'success' : 'warning'}>
                      {`<<${v}>>`} {mapped ? '' : '· unmapped'}
                    </Badge>
                  );
                })}
              </div>
              {unmappedVariables.length > 0 && (
                <p className="mt-2 text-amber-700 dark:text-amber-300">
                  {unmappedVariables.length} variable{unmappedVariables.length === 1 ? '' : 's'} not found in your
                  spreadsheet — they&apos;ll render as empty.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </FadeIn>

      {/* Attachments */}
      <FadeIn delay={0.15}>
      <Card>
        <CardHeader>
          <CardTitle>3. Attachments (optional)</CardTitle>
          <CardDescription>Same file for everyone, or one column with a per-row file path/URL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Fixed attachments (sent to every recipient)</Label>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {attachments.map((a, i) => (
                  <motion.div
                    key={`${a.name}-${i}`}
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{a.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatBytes(a.size)}</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleAttachmentRemove(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.label
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Paperclip className="h-4 w-4" />
                Add attachment
                <input type="file" multiple className="hidden" onChange={handleAttachmentAdd} />
              </motion.label>
            </div>
          </div>

          {upload && (
            <div className="space-y-2">
              <Label>Dynamic attachment column (per-recipient)</Label>
              <Controller
                name="dynamicAttachmentCol"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {upload.columns.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {dynamicAttachmentCol && (
                <p className="text-xs text-muted-foreground">
                  Each row&apos;s value in <strong>{dynamicAttachmentCol}</strong> will be treated as a file URL or
                  local path and attached to that email.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </FadeIn>

      {/* Actions */}
      <FadeIn delay={0.2} className="sticky bottom-0 -mx-4 -mb-4 md:-mx-8 md:-mb-8 flex items-center justify-between gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="text-sm text-muted-foreground">
          {upload ? <>Ready to send to <strong>{upload.rowCount}</strong> recipients</> : 'Upload a spreadsheet to begin'}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onPreview} disabled={isPreviewing || !upload} className="transition-transform active:scale-95">
            {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            Preview
          </Button>
          <Button type="submit" disabled={isSending || !upload || !senderReady} className="transition-transform active:scale-95">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send email
          </Button>
        </div>
      </FadeIn>

      {previewData && (
        <PreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          samples={previewData.samples}
          totalRecipients={previewData.totalRecipients}
          missingVariables={previewData.missingVariables}
        />
      )}

      <SendProgressDialog
        emailBatchId={sendingEmailBatchId}
        open={sendingEmailBatchId !== null}
        onViewDetails={() => {
          if (sendingEmailBatchId) router.push(`/history/${sendingEmailBatchId}`);
        }}
      />
    </form>
  );
}
