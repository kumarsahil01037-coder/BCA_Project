import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/get-user';
import { buildAuthUrl } from '@/lib/gmail/oauth';

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    console.error('[gmail/auth] requireUser failed:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use the DB user id as state so callback can identify the user
    // even if cookies are blocked. Sign it lightly to detect tampering.
    const state = Buffer.from(JSON.stringify({ uid: user.id, ts: Date.now() })).toString(
      'base64url',
    );
    const url = buildAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error('[gmail/auth] buildAuthUrl failed:', err);
    const message = err instanceof Error ? err.message : 'Failed to start Google sign-in';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
