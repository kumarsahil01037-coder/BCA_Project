'use server';

import { requireUser } from '@/lib/auth/get-user';
import { prisma } from '@/lib/db/prisma';
import { parseSpreadsheet } from '@/lib/excel/parser';

export async function uploadSpreadsheet(formData: FormData) {
  const user = await requireUser();
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('No file provided');

  const allowed = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  // Some browsers don't set proper MIME for .csv — fall back to extension
  const extOk = /\.(xlsx|xls|csv)$/i.test(file.name);
  if (!allowed.includes(file.type) && !extOk) {
    throw new Error('Only .xlsx, .xls, .csv files are supported');
  }
  if (file.size > 25 * 1024 * 1024) throw new Error('File exceeds 25MB limit');

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseSpreadsheet(buffer);

  if (parsed.rowCount === 0) throw new Error('Spreadsheet is empty');

  const upload = await prisma.excelUpload.create({
    data: {
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
      rowCount: parsed.rowCount,
      columns: parsed.columns,
      rowsJson: parsed.rows as object,
    },
  });

  return {
    uploadId: upload.id,
    columns: parsed.columns,
    rowCount: parsed.rowCount,
    emailColumns: parsed.emailColumns,
    invalidEmailRows: parsed.invalidEmailRows,
    previewRows: parsed.rows.slice(0, 10),
  };
}

export async function getUpload(id: string) {
  const user = await requireUser();
  return prisma.excelUpload.findFirst({ where: { id, userId: user.id } });
}
