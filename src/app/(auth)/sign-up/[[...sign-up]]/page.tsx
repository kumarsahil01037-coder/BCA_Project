import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignUpPage() {
  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const looksLikePlaceholder =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('xxxx') ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'pk_test_xxxxxxxxxxxxxxxxxxxx';

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-muted/40 p-4">
      {hasClerkKey && !looksLikePlaceholder ? (
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
          appearance={{ elements: { rootBox: 'shadow-xl' } }}
        />
      ) : (
        <div className="max-w-md rounded-xl border bg-card p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Authentication not configured</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Set <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">CLERK_SECRET_KEY</code> in your environment, then restart.
          </p>
          <Link href="/api/debug" className="mt-3 inline-block text-sm text-primary underline">
            Check configuration →
          </Link>
        </div>
      )}
    </div>
  );
}
