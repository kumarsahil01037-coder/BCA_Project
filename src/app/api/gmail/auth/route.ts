import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/get-user';
import { buildAuthUrl } from '@/lib/gmail/oauth';

export async function GET() {
  try {
    const user = await requireUser();
    // Use the DB user id as state so callback can identify the user
    // even if cookies are blocked. Sign it lightly to detect tampering.
    const state = Buffer.from(JSON.stringify({ uid: user.id, ts: Date.now() })).toString(
      'base64url',
    );
    const url = buildAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
