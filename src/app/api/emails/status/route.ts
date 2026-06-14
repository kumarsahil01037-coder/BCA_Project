import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const emailBatch = await prisma.emailBatch.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        status: true,
        totalCount: true,
        sentCount: true,
        failedCount: true,
        startedAt: true,
        completedAt: true,
      },
    });
    if (!emailBatch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Live counts from EmailLog for accurate in-flight progress
    const grouped = await prisma.emailLog.groupBy({
      by: ['status'],
      where: { emailBatchId: id },
      _count: true,
    });
    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.status] = g._count;

    return NextResponse.json({
      ...emailBatch,
      live: {
        pending: counts.PENDING ?? 0,
        sending: counts.SENDING ?? 0,
        sent: counts.SENT ?? 0,
        failed: counts.FAILED ?? 0,
        retrying: counts.RETRYING ?? 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
