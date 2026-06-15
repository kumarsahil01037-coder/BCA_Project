'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/get-user';
import { createBrevoSender, getBrevoSenderVerified } from '@/lib/email/brevo-sender';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getBrevoSenderAccount() {
  const user = await requireUser();
  return prisma.brevoSender.findUnique({
    where: { userId: user.id },
    select: { email: true, name: true, verified: true, connectedAt: true },
  });
}

export async function connectBrevoSender(input: { email: string; name?: string }) {
  const user = await requireUser();

  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  if (!EMAIL_RE.test(email)) throw new Error('Enter a valid email address');

  try {
    const { id } = await createBrevoSender(email, name);

    await prisma.brevoSender.upsert({
      where: { userId: user.id },
      create: { userId: user.id, email, name, brevoSenderId: id, verified: false },
      update: { email, name, brevoSenderId: id, verified: false },
    });
  } catch (err) {
    console.error('[connectBrevoSender] failed:', err);
    throw new Error('Could not start verification. Please try again in a moment.');
  }

  revalidatePath('/settings');
  revalidatePath('/compose');
  return { ok: true };
}

export async function refreshBrevoSenderStatus() {
  const user = await requireUser();

  const account = await prisma.brevoSender.findUnique({ where: { userId: user.id } });
  if (!account) throw new Error('No sender email pending verification');

  let verified: boolean;
  try {
    verified = await getBrevoSenderVerified(account.brevoSenderId);
  } catch (err) {
    console.error('[refreshBrevoSenderStatus] failed:', err);
    throw new Error('Could not check verification status. Please try again.');
  }

  if (verified !== account.verified) {
    await prisma.brevoSender.update({ where: { userId: user.id }, data: { verified } });
  }

  revalidatePath('/settings');
  revalidatePath('/compose');
  return { verified };
}

export async function disconnectBrevoSender() {
  const user = await requireUser();
  await prisma.brevoSender.deleteMany({ where: { userId: user.id } });
  revalidatePath('/settings');
  revalidatePath('/compose');
  return { ok: true };
}
