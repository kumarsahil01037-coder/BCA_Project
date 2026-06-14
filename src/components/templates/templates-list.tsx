'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Pencil, Trash2, FileText, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Template } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FadeInStagger, FadeInItem } from '@/components/motion/fade-in';
import { TemplateEditor } from './template-editor';
import { deleteTemplate, duplicateTemplate } from '@/server/actions/templates';
import { formatDate } from '@/lib/utils';

export function TemplatesList({ initial }: { initial: Template[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = items.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.subject.toLowerCase().includes(query.toLowerCase()),
  );

  const handleDuplicate = (id: string) => {
    startTransition(async () => {
      try {
        const copy = await duplicateTemplate(id);
        setItems((prev) => [copy, ...prev]);
        toast.success('Template duplicated');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteTemplate(id);
        setItems((prev) => prev.filter((t) => t.id !== id));
        setConfirmDelete(null);
        toast.success('Template deleted');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search templates…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> New template
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {query ? 'No templates match your search.' : 'No templates yet. Create one to reuse across emails.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <FadeInStagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map((t) => (
              <FadeInItem key={t.id}>
                <motion.div
                  layout
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                >
                  <Card className="group transition-shadow hover:shadow-md">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{t.name}</h3>
                          <p className="text-xs text-muted-foreground">{formatDate(t.updatedAt)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{t.subject}</p>
                      {t.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {t.variables.slice(0, 4).map((v) => (
                            <Badge key={v} variant="outline" className="text-xs">{`<<${v}>>`}</Badge>
                          ))}
                          {t.variables.length > 4 && (
                            <Badge variant="outline" className="text-xs">+{t.variables.length - 4}</Badge>
                          )}
                        </div>
                      )}
                      <div className="flex gap-1 pt-2 border-t -mx-5 px-5 -mb-5 pb-3">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(t)} disabled={isPending}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(t.id)} disabled={isPending}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-destructive hover:text-destructive"
                          onClick={() => setConfirmDelete(t)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </FadeInItem>
            ))}
          </AnimatePresence>
        </FadeInStagger>
      )}

      {(editing || creating) && (
        <TemplateEditor
          template={editing}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null);
              setCreating(false);
            }
          }}
          onSaved={(t) => {
            setItems((prev) => {
              const i = prev.findIndex((x) => x.id === t.id);
              if (i === -1) return [t, ...prev];
              const next = [...prev];
              next[i] = t;
              return next;
            });
            setEditing(null);
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              &ldquo;{confirmDelete?.name}&rdquo; will be permanently deleted. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete.id)}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
