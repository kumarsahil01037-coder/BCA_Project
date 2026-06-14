import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

const DEMO_MODE = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

// Anything matching these is allowed through without an auth check.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/admin-sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/gmail/callback(.*)',
  '/api/health',
  '/api/debug',
]);

// In demo mode we don't initialise Clerk at all — let everything through.
const demoMiddleware = (_req: NextRequest) => NextResponse.next();

const realMiddleware = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (!userId) {
    const signIn = new URL('/sign-in', req.url);
    signIn.searchParams.set('redirect_url', req.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
});

export default DEMO_MODE ? demoMiddleware : realMiddleware;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|webmanifest|woff2?|ttf|eot)$).*)',
    '/(api|trpc)(.*)',
  ],
};
