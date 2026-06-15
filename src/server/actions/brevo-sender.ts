'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/get-user';

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

  await prisma.brevoSender.upsert({
    where: { userId: user.id },
    create: { userId: user.id, email, name },
    update: { email, name },
  });

  revalidatePath('/settings');
  revalidatePath('/compose');
  return { ok: true };
}

export async function disconnectBrevoSender() {
  const user = await requireUser();
  await prisma.brevoSender.deleteMany({ where: { userId: user.id } });
  revalidatePath('/settings');
  revalidatePath('/compose');
  return { ok: true };
}
