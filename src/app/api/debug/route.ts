import { NextResponse } from 'next/server';

/**
 * GET /api/debug
 *
 * Surfaces which environment variables are present (NEVER their values).
 * Use this to diagnose blank/blinking sign-in pages caused by missing config.
 */
export async function GET() {
  const status = (key: string, value: string | undefined) => ({
    present: !!value,
    looksValid:
      !!value &&
      !value.includes('xxxx') &&
      !value.includes('replace_with') &&
      value !== 'pk_test_xxxxxxxxxxxxxxxxxxxx',
    hint: !value
      ? `Set ${key} in your environment`
      : value.includes('xxxx')
        ? 'Still has the placeholder value from .env.example'
        : 'OK',
  });

  const config = {
    clerk: {
      publishableKey: status('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
      secretKey: status('CLERK_SECRET_KEY', process.env.CLERK_SECRET_KEY),
      webhookSecret: status('CLERK_WEBHOOK_SECRET', process.env.CLERK_WEBHOOK_SECRET),
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '(default: /sign-in)',
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '(default: /sign-up)',
      afterSignInUrl:
        process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '(default: /)',
    },
    google: {
      clientId: status('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID),
      clientSecret: status('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET),
      redirectUri: process.env.GOOGLE_REDIRECT_URI || '(not set)',
    },
    database: {
      url: status('DATABASE_URL', process.env.DATABASE_URL),
    },
    encryption: {
      key: status('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY),
      validLength:
        process.env.ENCRYPTION_KEY?.length === 64
          ? 'OK (64 hex chars)'
          : `Got ${process.env.ENCRYPTION_KEY?.length ?? 0} chars, need 64 (run: openssl rand -hex 32)`,
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL || '(not set)',
      nodeEnv: process.env.NODE_ENV,
    },
  };

  // Compute an overall readiness verdict
  const ready =
    config.clerk.publishableKey.looksValid &&
    config.clerk.secretKey.looksValid &&
    config.database.url.present;

  return NextResponse.json(
    {
      ready,
      message: ready
        ? '✅ Core config looks good. If sign-in still fails, check Clerk Dashboard → Domains.'
        : '❌ Missing or placeholder config. See details below.',
      config,
    },
    { status: 200 },
  );
}
