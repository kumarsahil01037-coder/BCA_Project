'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createAccount, deleteAccount } from '@/server/actions/accounts';

interface AccountItem {
  id: string;
  name: string;
}

export function AccountTypes({ accounts }: { accounts: AccountItem[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await createAccount(trimmed);
        setName('');
        toast.success(`Added "${trimmed}"`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add account');
      }
    });
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteAccount(id);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove account');
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-4 w-4" /> Add Accounts
        </CardTitle>
        <CardDescription>
          Define the account types (e.g. dealer or product variants) you send emails for. They&apos;ll
          appear as a dropdown when composing a new email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            placeholder="e.g. M&M Type-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending || !name.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </form>

        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <Badge key={a.id} variant="outline" className="flex items-center gap-1.5 py-1.5 pl-3 pr-1.5 text-sm">
                {a.name}
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={isPending}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${a.name}`}
                >
                  {deletingId === a.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
