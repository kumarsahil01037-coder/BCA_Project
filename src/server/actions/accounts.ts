'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/get-user';

export async function listAccounts() {
  const user = await requireUser();
  return prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  });
}

export async function createAccount(name: string) {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Account name is required');

  const account = await prisma.account.create({
    data: { userId: user.id, name: trimmed },
  });
  revalidatePath('/settings');
  revalidatePath('/compose');
  return account;
}

export async function deleteAccount(id: string) {
  const user = await requireUser();
  await prisma.account.delete({ where: { id, userId: user.id } });
  revalidatePath('/settings');
  revalidatePath('/compose');
  return { ok: true };
}
