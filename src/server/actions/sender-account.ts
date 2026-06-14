'use server';

import { revalidatePath } from 'next/cache';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/get-user';
import { encrypt } from '@/lib/auth/crypto';
import { PROVIDER_PRESETS, type SenderProvider } from '@/lib/email/providers';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getSenderAccount() {
  const user = await requireUser();
  return prisma.senderAccount.findUnique({
    where: { userId: user.id },
    select: { email: true, name: true, host: true, port: true, connectedAt: true },
  });
}

export async function connectSenderAccount(input: {
  email: string;
  appPassword: string;
  name?: string;
  provider?: SenderProvider;
  host?: string;
  port?: number;
}) {
  const user = await requireUser();

  const email = input.email.trim().toLowerCase();
  const appPassword = input.appPassword.trim().replace(/\s+/g, '');
  const name = input.name?.trim() || null;

  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address');
  if (!appPassword) throw new Error('App password is required');

  let host: string;
  let port: number;
  if (input.provider && input.provider !== 'custom') {
    ({ host, port } = PROVIDER_PRESETS[input.provider]);
  } else {
    host = input.host?.trim() || 'smtp.gmail.com';
    port = input.port || 465;
  }

  // Verify the credentials work before saving.
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: email, pass: appPassword },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  try {
    await transport.verify();
  } catch (err) {
    const code = (err as { code?: string; command?: string })?.code;
    console.error('SMTP verify failed:', code, err);
    if (code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION') {
      throw new Error(`Could not reach ${host}:${port} from the server (network/connection issue: ${code}).`);
    }
    throw new Error('Could not sign in with that email and app password. Double-check both and try again.');
  }

  await prisma.senderAccount.upsert({
    where: { userId: user.id },
    create: { userId: user.id, email, name, appPassword: encrypt(appPassword), host, port },
    update: { email, name, appPassword: encrypt(appPassword), host, port },
  });

  revalidatePath('/settings');
  revalidatePath('/compose');
  return { ok: true };
}

export async function disconnectSenderAccount() {
  const user = await requireUser();
  await prisma.senderAccount.deleteMany({ where: { userId: user.id } });
  revalidatePath('/settings');
  revalidatePath('/compose');
  return { ok: true };
}
