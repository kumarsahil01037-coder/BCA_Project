'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { addAllowedEmail, removeAllowedEmail } from '@/server/actions/admin';

interface AllowedEmailItem {
  id: string;
  email: string;
  addedBy: string;
  createdAt: Date;
}

export function AccessManager({ entries }: { entries: AllowedEmailItem[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await addAllowedEmail(trimmed);
        setEmail('');
        toast.success(`Granted access to ${trimmed}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to grant access');
      }
    });
  };

  const handleRemove = (id: string) => {
    setRemovingId(id);
    startTransition(async () => {
      try {
        await removeAllowedEmail(id);
        toast.success('Access revoked');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to revoke access');
      } finally {
        setRemovingId(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> User access
        </CardTitle>
        <CardDescription>
          Only people whose email is listed here (or who are admins) can sign in and use Penarreach.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            type="email"
            placeholder="someone@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending || !email.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Grant access
          </Button>
        </form>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users have been granted access yet.</p>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{entry.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Added {formatDate(entry.createdAt)} by {entry.addedBy}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(entry.id)}
                  disabled={isPending}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Revoke access for ${entry.email}`}
                >
                  {removingId === entry.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
