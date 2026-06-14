import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createOAuthClient } from '@/lib/gmail/oauth';
import { prisma } from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/crypto';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (error) {
    return NextResponse.redirect(`${appUrl}/settings?gmail=error&reason=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?gmail=error&reason=missing_code`);
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    userId = decoded.uid;
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?gmail=error&reason=bad_state`);
  }

  try {
    const oauth = createOAuthClient();
    const { tokens } = await oauth.getToken(code);
    oauth.setCredentials(tokens);

    // Fetch the actual Gmail address
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth });
    const info = await oauth2.userinfo.get();
    const email = info.data.email;
    if (!email) throw new Error('Could not fetch Gmail address');

    if (!tokens.refresh_token) {
      // refresh token is only returned on first consent; force users to revoke + retry if missing
      return NextResponse.redirect(
        `${appUrl}/settings?gmail=error&reason=no_refresh_token`,
      );
    }

    await prisma.gmailAccount.upsert({
      where: { userId },
      update: {
        email,
        accessToken: encrypt(tokens.access_token ?? ''),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
        scope: tokens.scope ?? '',
        tokenType: tokens.token_type ?? 'Bearer',
      },
      create: {
        userId,
        email,
        accessToken: encrypt(tokens.access_token ?? ''),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
        scope: tokens.scope ?? '',
        tokenType: tokens.token_type ?? 'Bearer',
      },
    });

    return NextResponse.redirect(`${appUrl}/settings?gmail=connected`);
  } catch (err) {
    console.error('Gmail callback error:', err);
    return NextResponse.redirect(`${appUrl}/settings?gmail=error&reason=token_exchange`);
  }
}
