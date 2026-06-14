import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/db/prisma';
import { runEmailBatch } from '@/server/services/email-batch-processor';

export const maxDuration = 300; // seconds (Vercel/Node runtime)
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { emailBatchId } = (await req.json()) as { emailBatchId: string };
    if (!emailBatchId) return NextResponse.json({ error: 'emailBatchId required' }, { status: 400 });

    const emailBatch = await prisma.emailBatch.findFirst({
      where: { id: emailBatchId, userId: user.id },
    });
    if (!emailBatch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fire-and-forget. We don't await — the client polls /status.
    runEmailBatch(emailBatchId).catch((e) => console.error('runEmailBatch crashed:', e));

    return NextResponse.json({ ok: true, emailBatchId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
