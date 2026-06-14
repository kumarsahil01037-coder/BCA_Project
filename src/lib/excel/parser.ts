import * as XLSX from 'xlsx';
import { isValidEmail } from '@/lib/utils';

export interface ParsedSheet {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  emailColumns: string[];          // columns that look like email columns
  invalidEmailRows: number[];      // row indices with invalid emails (in any email col)
}

/**
 * Parse an uploaded XLSX/XLS/CSV file (as ArrayBuffer / Buffer) into
 * structured rows + columns.  Auto-detects header row and email-shaped cols.
 */
export function parseSpreadsheet(buffer: ArrayBuffer | Buffer): ParsedSheet {
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error('Workbook has no sheets');
  const sheet = wb.Sheets[firstSheetName];

  // defval:'' preserves empty cells so column shapes line up
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (!rawRows.length) {
    return { columns: [], rows: [], rowCount: 0, emailColumns: [], invalidEmailRows: [] };
  }

  // Some cells (e.g. native date/time columns) come back as Date objects or
  // other non-plain values even with raw:false. Coerce everything to plain
  // strings/numbers/booleans so rows can be safely passed to Client
  // Components and stored as JSON.
  const rows = rawRows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) out[key] = value.toISOString();
      else if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        out[key] = value;
      } else {
        out[key] = String(value);
      }
    }
    return out;
  });

  const columns = Object.keys(rows[0]);

  // Detect email columns: column name contains "email" OR most cells look like emails
  const emailColumns: string[] = [];
  for (const col of columns) {
    const nameLooksLikeEmail = /e[-_ ]?mail/i.test(col);
    const sample = rows.slice(0, Math.min(20, rows.length));
    const validShare =
      sample.filter((r) => isValidEmail(String(r[col] ?? ''))).length / sample.length;
    if (nameLooksLikeEmail || validShare > 0.6) emailColumns.push(col);
  }

  // Mark rows where any detected email column has invalid content
  const invalidEmailRows: number[] = [];
  rows.forEach((r, i) => {
    for (const col of emailColumns) {
      const v = String(r[col] ?? '').trim();
      if (v && !isValidEmail(v)) {
        invalidEmailRows.push(i);
        break;
      }
    }
  });

  return {
    columns,
    rows,
    rowCount: rows.length,
    emailColumns,
    invalidEmailRows,
  };
}
