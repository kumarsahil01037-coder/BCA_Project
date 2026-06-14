/**
 * Variable mapping engine.
 *
 * Replaces <<ColumnName>> placeholders in arbitrary strings (subject,
 * HTML body, to/cc fields, attachment paths) with values from an Excel row.
 *
 * - Matching is case-insensitive and tolerates surrounding whitespace
 *   inside the angle brackets ("<< First Name >>" works).
 * - Missing values resolve to an empty string (and are reported).
 * - HTML-escapes values when escapeHtml=true (for HTML body interpolation),
 *   otherwise inserts raw (for headers, plain text, attachment paths).
 */
export const PLACEHOLDER_RE = /<<\s*([^<>]+?)\s*>>/g;

export function extractVariables(text: string): string[] {
  const set = new Set<string>();
  const normalized = text.replace(/&lt;&lt;/g, '<<').replace(/&gt;&gt;/g, '>>');
  let m: RegExpExecArray | null;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((m = PLACEHOLDER_RE.exec(normalized)) !== null) set.add(m[1].trim());
  return [...set];
}

export function extractAllVariables(parts: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const p of parts) {
    if (!p) continue;
    for (const v of extractVariables(p)) set.add(v);
  }
  return [...set];
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface RenderResult {
  output: string;
  missing: string[]; // variable names that didn't resolve to a non-empty value
}

export function renderTemplate(
  template: string,
  row: Record<string, unknown>,
  options: { escapeHtml?: boolean } = {},
): RenderResult {
  const escape = options.escapeHtml ?? false;
  const missing: string[] = [];

  // Rich-text editors HTML-escape literal "<<" / ">>" typed by the user into
  // "&lt;&lt;" / "&gt;&gt;". Normalize those back so placeholders still match.
  const normalized = template.replace(/&lt;&lt;/g, '<<').replace(/&gt;&gt;/g, '>>');

  // Build a case-insensitive lookup of row keys
  const lookup = new Map<string, unknown>();
  for (const key of Object.keys(row)) lookup.set(key.toLowerCase().trim(), row[key]);

  const output = normalized.replace(PLACEHOLDER_RE, (_match, name: string) => {
    const key = name.toLowerCase().trim();
    const raw = lookup.get(key);
    const val = raw == null ? '' : String(raw);
    if (val.trim() === '') missing.push(name.trim());
    return escape ? htmlEscape(val) : val;
  });

  return { output, missing };
}

export interface RenderedEmail {
  to: string;
  cc: string | null;
  subject: string;
  bodyHtml: string;
  attachmentPath: string | null; // resolved dynamic attachment if any
  missingVariables: string[];
}

export interface RenderEmailArgs {
  toTemplate: string;
  ccTemplate?: string | null;
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  dynamicAttachmentCol?: string | null;
  row: Record<string, unknown>;
}

export function renderEmail(args: RenderEmailArgs): RenderedEmail {
  const to = renderTemplate(args.toTemplate, args.row);
  const cc = args.ccTemplate ? renderTemplate(args.ccTemplate, args.row) : null;
  const subject = renderTemplate(args.subjectTemplate, args.row);
  const body = renderTemplate(args.bodyHtmlTemplate, args.row, { escapeHtml: false });

  const allMissing = new Set<string>([
    ...to.missing,
    ...(cc?.missing ?? []),
    ...subject.missing,
    ...body.missing,
  ]);

  let attachmentPath: string | null = null;
  if (args.dynamicAttachmentCol) {
    const raw = args.row[args.dynamicAttachmentCol];
    attachmentPath = raw == null ? null : String(raw).trim() || null;
  }

  return {
    to: to.output.trim(),
    cc: cc?.output.trim() || null,
    subject: subject.output,
    bodyHtml: body.output,
    attachmentPath,
    missingVariables: [...allMissing],
  };
}
