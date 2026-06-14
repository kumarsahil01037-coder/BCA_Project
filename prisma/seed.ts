import { PrismaClient, EmailBatchStatus, EmailStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data…');

  const user = await prisma.user.upsert({
    where: { clerkId: 'demo_user_clerk_id' },
    update: {},
    create: {
      clerkId: 'demo_user_clerk_id',
      email: 'demo@penarreach.local',
      firstName: 'Demo',
      lastName: 'User',
    },
  });

  // ---- Templates ----
  const existing = await prisma.template.count({ where: { userId: user.id } });
  if (existing === 0) {
    await prisma.template.createMany({
      data: [
        {
          userId: user.id,
          name: 'Dealer outreach intro',
          subject: 'Hi <<FirstName>>, quick update on the <<Region>> rollout',
          bodyHtml:
            '<p>Hi <<FirstName>>,</p><p>Hope all is well at <<Company>>. Wanted to share the latest on the <<Region>> rollout and check if you have any questions.</p><p>Best,<br/>Sahil</p>',
          toField: '<<Email>>',
          ccField: null,
          variables: ['FirstName', 'Region', 'Company', 'Email'],
        },
        {
          userId: user.id,
          name: 'Site handover follow-up',
          subject: 'Site <<SiteCode>> — handover documents pending',
          bodyHtml:
            '<p>Hi <<FirstName>>,</p><p>This is a gentle reminder for the pending handover documents at site <<SiteCode>> (<<SiteName>>). Could you confirm an ETA by Friday?</p><p>Thanks,<br/>Sahil</p>',
          toField: '<<Email>>',
          ccField: '<<ManagerEmail>>',
          variables: ['FirstName', 'SiteCode', 'SiteName', 'Email', 'ManagerEmail'],
        },
        {
          userId: user.id,
          name: 'Monthly billing reconciliation',
          subject: 'Billing reconciliation — <<Month>>',
          bodyHtml:
            '<p>Hi <<FirstName>>,</p><p>Attaching this month\'s reconciliation. Please review and revert with any discrepancies by EOD <<DueDate>>.</p>',
          toField: '<<Email>>',
          ccField: null,
          variables: ['FirstName', 'Month', 'DueDate', 'Email'],
        },
      ],
    });
  }

  // ---- A finished email batch with mixed results ----
  const emailBatchExists = await prisma.emailBatch.count({ where: { userId: user.id } });
  if (emailBatchExists === 0) {
    const rows = Array.from({ length: 12 }).map((_, i) => ({
      Email: `dealer${i + 1}@example.com`,
      FirstName: ['Rajesh', 'Priya', 'Amit', 'Neha', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rohan', 'Ananya', 'Karan', 'Meera'][i],
      Company: ['Jamkash Vehicles', 'Sundaram Motors', 'Mandovi Motors', 'Pratham Cars', 'Anant Auto', 'Capital Cars', 'KHT Auto', 'Visakha Motors', 'Sai Service', 'Concorde Motors', 'Trident Auto', 'Pioneer Motors'][i],
      Region: ['South-1', 'South-1', 'South-1', 'South-1', 'South-1', 'South-1', 'South-1', 'South-1', 'South-1', 'South-1', 'South-1', 'South-1'][i],
      SiteCode: `12NB-${String(i + 1).padStart(2, '0')}`,
    }));

    const upload = await prisma.excelUpload.create({
      data: {
        userId: user.id,
        fileName: 'dealers_south1_q3.xlsx',
        fileSize: 18432,
        rowCount: rows.length,
        columns: ['Email', 'FirstName', 'Company', 'Region', 'SiteCode'],
        rowsJson: rows,
      },
    });

    const emailBatch = await prisma.emailBatch.create({
      data: {
        userId: user.id,
        uploadId: upload.id,
        name: 'Q3 South-1 dealer outreach',
        subject: 'Hi <<FirstName>>, quick update on the <<Region>> rollout',
        bodyHtml:
          '<p>Hi <<FirstName>>,</p><p>Hope all is well at <<Company>>. Wanted to share the latest on the <<Region>> rollout for site <<SiteCode>>.</p>',
        toField: '<<Email>>',
        ccField: null,
        fromEmail: 'demo@penarreach.local',
        fromName: 'Demo User',
        fixedAttachments: [],
        status: EmailBatchStatus.PARTIAL,
        totalCount: rows.length,
        sentCount: 10,
        failedCount: 2,
        startedAt: new Date(Date.now() - 1000 * 60 * 30),
        completedAt: new Date(Date.now() - 1000 * 60 * 28),
      },
    });

    await prisma.emailLog.createMany({
      data: rows.map((row, i) => {
        const failed = i === 4 || i === 9;
        return {
          emailBatchId: emailBatch.id,
          to: row.Email,
          subject: `Hi ${row.FirstName}, quick update on the ${row.Region} rollout`,
          bodyHtml: `<p>Hi ${row.FirstName},</p><p>Hope all is well at ${row.Company}…</p>`,
          rowData: row,
          attachments: [],
          status: failed ? EmailStatus.FAILED : EmailStatus.SENT,
          messageId: failed ? null : `demo-msg-${i}`,
          attempts: failed ? 3 : 1,
          errorMessage: failed ? 'Demo: simulated SMTP failure (try Retry to see the flow)' : null,
          sentAt: failed ? null : new Date(Date.now() - 1000 * 60 * (29 - i)),
        };
      }),
    });

    // A second email batch that's in progress (so dashboard shows variety)
    await prisma.emailBatch.create({
      data: {
        userId: user.id,
        name: 'Welcome sequence — new signups',
        subject: 'Welcome to Penarreach, <<FirstName>>',
        bodyHtml: '<p>Welcome <<FirstName>>!</p>',
        toField: '<<Email>>',
        fromEmail: 'demo@penarreach.local',
        status: EmailBatchStatus.COMPLETED,
        totalCount: 47,
        sentCount: 47,
        failedCount: 0,
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 23),
      },
    });
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
