'use client';
import { useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Template } from '@prisma/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RichEditor } from '@/components/compose/rich-editor';
import { templateSchema, type TemplateInput } from '@/lib/validators/schemas';
import { createTemplate, updateTemplate } from '@/server/actions/templates';

interface Props {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (t: Template) => void;
}

export function TemplateEditor({ template, open, onOpenChange, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name ?? '',
      subject: template?.subject ?? '',
      bodyHtml: template?.bodyHtml ?? '',
      toField: template?.toField ?? '<<Email>>',
      ccField: template?.ccField ?? '',
    },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      try {
        const saved = template
          ? await updateTemplate(template.id, data)
          : await createTemplate(data);
        toast.success(template ? 'Template updated' : 'Template created');
        onSaved(saved);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Save failed');
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit template' : 'New template'}</DialogTitle>
          <DialogDescription>
            Use <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;&lt;Column&gt;&gt;</code> placeholders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-name">Name</Label>
            <Input id="t-name" {...register('name')} placeholder="Outreach intro" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="t-to">To</Label>
              <Input id="t-to" {...register('toField')} placeholder="<<Email>>" />
              {errors.toField && <p className="text-xs text-destructive">{errors.toField.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-cc">Cc (optional)</Label>
              <Input id="t-cc" {...register('ccField')} placeholder="<<Manager>>" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-subject">Subject</Label>
            <Input id="t-subject" {...register('subject')} placeholder="Hi <<FirstName>>" />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Body</Label>
            <Controller
              name="bodyHtml"
              control={control}
              render={({ field }) => (
                <RichEditor value={field.value || ''} onChange={field.onChange} placeholder="Write your template…" />
              )}
            />
            {errors.bodyHtml && <p className="text-xs text-destructive">{errors.bodyHtml.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {template ? 'Save changes' : 'Create template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
