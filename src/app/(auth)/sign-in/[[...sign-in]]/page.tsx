import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignInPage() {
  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const looksLikePlaceholder =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('xxxx') ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'pk_test_xxxxxxxxxxxxxxxxxxxx';

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-muted/40 p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          User sign in
        </div>
        {hasClerkKey && !looksLikePlaceholder ? (
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/dashboard"
            appearance={{ elements: { rootBox: 'shadow-xl' } }}
          />
        ) : (
          <ConfigError missing="NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" />
        )}
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          Your email must be granted access by an admin before you can sign in. If you haven&apos;t been
          granted access yet, you&apos;ll see an &quot;Access denied&quot; notice after signing in.
        </p>
        <Link href="/admin-sign-in" className="text-sm text-primary hover:underline">
          Are you an admin? Sign in here →
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
      <ol className="mt-4 list-decimal pl-5 text-sm space-y-1 text-muted-foreground">
        <li>Get keys from <a className="text-primary underline" href="https://dashboard.clerk.com" target="_blank" rel="noreferrer">dashboard.clerk.com</a> → API Keys</li>
        <li>Add to <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> (or your platform&apos;s env settings)</li>
        <li>Restart the dev server</li>
        <li>Visit <Link href="/api/debug" className="text-primary underline">/api/debug</Link> to verify</li>
      </ol>
      <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}
