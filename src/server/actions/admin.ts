'use server';
import { revalidatePath } from 'next/cache';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/get-user';

export async function listAllowedEmails() {
  await requireAdmin();
  return prisma.allowedEmail.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function addAllowedEmail(email: string) {
  const admin = await requireAdmin();
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error('Email is required');

  const existing = await prisma.allowedEmail.findUnique({ where: { email: trimmed } });
  if (existing) throw new Error('This email already has access');

  const entry = await prisma.allowedEmail.create({ data: { email: trimmed, addedBy: admin.email } });

  try {
    const clerk = await clerkClient();
    await clerk.allowlistIdentifiers.createAllowlistIdentifier({ identifier: trimmed, notify: false });
  } catch {
    // Already on Clerk's allowlist, or Clerk allowlist restriction isn't enabled — non-fatal.
  }

  revalidatePath('/admin');
  return entry;
}

export async function removeAllowedEmail(id: string) {
  await requireAdmin();
  const entry = await prisma.allowedEmail.delete({ where: { id } });

  try {
    const clerk = await clerkClient();
    const { data } = await clerk.allowlistIdentifiers.getAllowlistIdentifierList();
    const match = data.find((i) => i.identifier.toLowerCase() === entry.email.toLowerCase());
    if (match) await clerk.allowlistIdentifiers.deleteAllowlistIdentifier(match.id);
  } catch {
    // non-fatal — Clerk allowlist entry may not exist or restriction may be disabled.
  }

  revalidatePath('/admin');
  return { ok: true };
}
