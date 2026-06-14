'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle2, KeyRound, Loader2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { connectSenderAccount, disconnectSenderAccount } from '@/server/actions/sender-account';
import type { SenderProvider } from '@/lib/email/providers';

interface Props {
  account: { email: string; name: string | null; host: string; port: number; connectedAt: Date } | null;
}

const PROVIDERS: { value: SenderProvider; label: string; helpUrl: string; helpLabel: string }[] = [
  { value: 'gmail', label: 'Gmail', helpUrl: 'https://myaccount.google.com/apppasswords', helpLabel: 'myaccount.google.com/apppasswords' },
  { value: 'outlook', label: 'Outlook', helpUrl: 'https://account.microsoft.com/security', helpLabel: 'account.microsoft.com/security' },
  { value: 'custom', label: 'Custom SMTP', helpUrl: '', helpLabel: '' },
];

export function SenderDetails({ account }: Props) {
  const router = useRouter();
  const [provider, setProvider] = useState<SenderProvider>('gmail');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [isPending, startTransition] = useTransition();

  const activeProvider = PROVIDERS.find((p) => p.value === provider)!;

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await connectSenderAccount({
          email,
          appPassword,
          name: name || undefined,
          provider,
          host: provider === 'custom' ? host : undefined,
          port: provider === 'custom' ? parseInt(port, 10) || undefined : undefined,
        });
        toast.success('Sender email connected');
        setEmail('');
        setName('');
        setAppPassword('');
        setHost('');
        setPort('');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to connect');
      }
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      try {
        await disconnectSenderAccount();
        toast.success('Sender email removed');
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
          <Mail className="h-4 w-4" /> Sender details
        </CardTitle>
        <CardDescription>
          Add your own email so messages are sent genuinely from your address. Works with Gmail,
          Outlook, or any SMTP provider using an app password — no Google/Microsoft sign-in flow.
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
                <div className="text-xs text-muted-foreground">
                  {account.name ? `${account.name} · ` : ''}{account.host} · Connected {formatDate(account.connectedAt)}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleDisconnect} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
              Remove
            </Button>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label>Email provider</Label>
              <div className="flex gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setProvider(p.value)}
                    disabled={isPending}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      provider === p.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="senderEmail">Email address</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderName">Display name (optional)</Label>
                <Input
                  id="senderName"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            {provider === 'custom' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP host</Label>
                  <Input
                    id="smtpHost"
                    placeholder="smtp.yourprovider.com"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    disabled={isPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    placeholder="465"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    disabled={isPending}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="appPassword" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> App password
              </Label>
              <Input
                id="appPassword"
                type="password"
                placeholder="xxxx xxxx xxxx xxxx"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                disabled={isPending}
                required
              />
              <p className="text-xs text-muted-foreground">
                {activeProvider.helpUrl ? (
                  <>
                    Generate one at{' '}
                    <a href={activeProvider.helpUrl} target="_blank" rel="noreferrer" className="underline">
                      {activeProvider.helpLabel}
                    </a>{' '}
                    (requires 2-step verification on the account). Takes about a minute.
                  </>
                ) : (
                  'Use an app password or SMTP credential from your email provider.'
                )}
              </p>
            </div>
            <Button type="submit" disabled={isPending} className="transition-transform hover:scale-105 active:scale-95">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
