import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/db/prisma';

export async function POST() {
  try {
    const user = await requireUser();
    await prisma.gmailAccount.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
