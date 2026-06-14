import { cache } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import type { User, Role } from '@prisma/client';

const DEMO_MODE = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
const DEMO_CLERK_ID = 'demo_user_clerk_id';
const DEMO_EMAIL = 'demo@penarreach.local';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function roleForEmail(email: string): Role {
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? 'ADMIN' : 'USER';
}

export class AccessDeniedError extends Error {
  constructor() {
    super('ACCESS_DENIED');
  }
}

/**
 * Returns the DB user for the currently authenticated Clerk user.
 * Creates the row if it doesn't exist yet (handles edge cases where the
 * Clerk webhook hasn't fired yet).
 *
 * When DEMO_MODE=1, returns a stub demo user without touching Clerk —
 * useful for previewing the UI without configuring auth/DB credentials.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (DEMO_MODE) {
    return prisma.user.upsert({
      where: { clerkId: DEMO_CLERK_ID },
      update: {},
      create: {
        clerkId: DEMO_CLERK_ID,
        email: DEMO_EMAIL,
        firstName: 'Demo',
        lastName: 'User',
        imageUrl: null,
      },
    });
  }

  const { userId } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (user) {
    // Keep role in sync with ADMIN_EMAILS in case it changed.
    const expectedRole = roleForEmail(user.email);
    if (user.role !== expectedRole) {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: expectedRole } });
    }
    return user;
  }

  const clerk = await currentUser();
  if (!clerk) return null;

  const email = clerk.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: {
      clerkId: userId,
      email,
      firstName: clerk.firstName,
      lastName: clerk.lastName,
      imageUrl: clerk.imageUrl,
      role: roleForEmail(email),
    },
  });

  return user;
});

export const requireUser = cache(async (): Promise<User> => {
  const u = await getCurrentUser();
  if (!u) throw new Error('UNAUTHENTICATED');
  if (DEMO_MODE || u.role === 'ADMIN') return u;

  const allowed = await prisma.allowedEmail.findUnique({ where: { email: u.email } });
  if (!allowed) throw new AccessDeniedError();
  return u;
});

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== 'ADMIN') throw new Error('FORBIDDEN');
  return u;
}
