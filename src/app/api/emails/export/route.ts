import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    // Minutes to add to a UTC timestamp to get the user's local time
    // (= -getTimezoneOffset() from the browser). Used so date-range filters
    // line up with the user's local calendar days, not UTC days.
    const tzOffset = parseInt(url.searchParams.get('tz') ?? '0', 10) || 0;

    const where: Prisma.EmailLogWhereInput = {
      emailBatch: { userId: user.id },
    };
    if (from || to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (from) createdAt.gte = new Date(new Date(`${from}T00:00:00.000Z`).getTime() + tzOffset * 60000);
      if (to) createdAt.lte = new Date(new Date(`${to}T23:59:59.999Z`).getTime() + tzOffset * 60000);
      where.createdAt = createdAt;
    }

    const logs = await prisma.emailLog.findMany({
      where,
      include: { emailBatch: { select: { name: true, fromEmail: true, totalCount: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const rows = logs.map((l) => ({
      'Email name': l.emailBatch.name,
      'Template Name': '',
      'Send from': l.emailBatch.fromEmail,
      To: l.to,
      Cc: l.cc ?? '',
      Subject: l.subject,
      Quantity: l.emailBatch.totalCount,
      'Date & Time': l.sentAt ? l.sentAt.toISOString() : l.createdAt.toISOString(),
      Status: l.status,
      Error: l.errorMessage ?? '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        'Email name',
        'Template Name',
        'Send from',
        'To',
        'Cc',
        'Subject',
        'Quantity',
        'Date & Time',
        'Status',
        'Error',
      ],
    });
    XLSX.utils.book_append_sheet(wb, ws, 'Sent Emails');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="penarreach-sent-emails.xlsx"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
