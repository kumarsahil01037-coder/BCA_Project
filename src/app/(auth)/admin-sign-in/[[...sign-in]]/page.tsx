import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

const DEMO_MODE = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

export default function AdminSignInPage() {
  if (DEMO_MODE) redirect('/admin');

  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const looksLikePlaceholder =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('xxxx') ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'pk_test_xxxxxxxxxxxxxxxxxxxx';

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-muted/40 p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Admin sign in
        </div>
        {hasClerkKey && !looksLikePlaceholder ? (
          <SignIn
            path="/admin-sign-in"
            routing="path"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/admin"
            appearance={{ elements: { rootBox: 'shadow-xl' } }}
          />
        ) : (
          <ConfigError missing="NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" />
        )}
        <Link href="/sign-in" className="text-sm text-primary hover:underline">
          Not an admin? Sign in as a user →
        </Link>
      </div>
    </div>
  );
}

function ConfigError({ missing }: { missing: string }) {
  return (
    <div className="max-w-md rounded-xl border bg-card p-6 shadow-lg">
      <h2 className="text-lg font-semibold">Authentication not configured</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Penarreach needs Clerk credentials to handle sign-in. Set{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">{missing}</code> and{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">CLERK_SECRET_KEY</code> in your environment, then restart the server.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}
