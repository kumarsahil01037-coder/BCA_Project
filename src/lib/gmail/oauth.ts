import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/db/prisma';
import { decrypt, encrypt } from '@/lib/auth/crypto';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export function createOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth env variables');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES,
    state,
  });
}

/**
 * Returns an authorized OAuth2Client for the given user, transparently
 * refreshing the access token when expired and persisting the new token.
 */
export async function getAuthorizedClient(userId: string): Promise<OAuth2Client> {
  const account = await prisma.gmailAccount.findUnique({ where: { userId } });
  if (!account) throw new Error('Gmail not connected for this user');

  const client = createOAuthClient();
  client.setCredentials({
    access_token: decrypt(account.accessToken),
    refresh_token: decrypt(account.refreshToken),
    expiry_date: account.expiresAt.getTime(),
    scope: account.scope,
    token_type: account.tokenType,
  });

  // Auto-persist refreshed tokens
  client.on('tokens', async (tokens) => {
    try {
      const update: Record<string, unknown> = {};
      if (tokens.access_token) update.accessToken = encrypt(tokens.access_token);
      if (tokens.refresh_token) update.refreshToken = encrypt(tokens.refresh_token);
      if (tokens.expiry_date) update.expiresAt = new Date(tokens.expiry_date);
      if (Object.keys(update).length > 0) {
        await prisma.gmailAccount.update({ where: { userId }, data: update });
      }
    } catch (e) {
      console.error('Failed to persist refreshed Gmail token:', e);
    }
  });

  // Force a refresh if expired
  if (account.expiresAt.getTime() <= Date.now()) {
    await client.getAccessToken();
  }

  return client;
}
