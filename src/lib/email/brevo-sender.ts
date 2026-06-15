import type { AttachmentInput, SendArgs } from '@/lib/gmail/sender';

const BREVO_API = 'https://api.brevo.com/v3';

function getApiKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY is not configured on the server');
  return key;
}

async function brevoFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BREVO_API}${path}`, {
    ...init,
    headers: {
      'api-key': getApiKey(),
      'content-type': 'application/json',
      accept: 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API ${path} failed (${res.status}): ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

/**
 * Brevo requires the technical "From" address to be a sender it has
 * verified/authenticated. To let users send from *any* address (Gmail,
 * Outlook, Yahoo, or a company domain — even ones Brevo can't verify due
 * to DMARC), every message is sent from this single pre-verified address,
 * with the user's chosen address set as Reply-To and their name as the
 * display name. Recipients reply straight to the user's real inbox.
 */
function getVerifiedSenderEmail(): string {
  const email = process.env.BREVO_VERIFIED_SENDER_EMAIL;
  if (!email) throw new Error('BREVO_VERIFIED_SENDER_EMAIL is not configured on the server');
  return email;
}

/**
 * Sends via the Brevo transactional email HTTPS API — works on hosts
 * that block outbound SMTP, using the app's shared Brevo account. The
 * user's chosen email/name appear as the display sender and Reply-To.
 */
export async function sendViaBrevo(
  args: SendArgs & { senderEmail: string; senderName?: string | null },
): Promise<{ messageId: string }> {
  const res = (await brevoFetch('/smtp/email', {
    method: 'POST',
    body: JSON.stringify({
      sender: { email: getVerifiedSenderEmail(), name: args.senderName || args.senderEmail },
      replyTo: { email: args.senderEmail, name: args.senderName || undefined },
      to: [{ email: args.to }],
      cc: args.cc ? [{ email: args.cc }] : undefined,
      subject: args.subject,
      htmlContent: args.html,
      textContent: args.text,
      attachment: await toBrevoAttachments(args.attachments),
    }),
  })) as { messageId: string };

  return { messageId: res.messageId };
}

async function toBrevoAttachments(attachments?: AttachmentInput[]) {
  if (!attachments || attachments.length === 0) return undefined;

  const out: { name: string; content: string }[] = [];
  for (const a of attachments) {
    let content: Buffer;
    if (a.content) {
      content = typeof a.content === 'string' ? Buffer.from(a.content, 'base64') : a.content;
    } else if (a.path && /^https?:\/\//i.test(a.path)) {
      const res = await fetch(a.path);
      if (!res.ok) continue;
      content = Buffer.from(await res.arrayBuffer());
    } else {
      continue;
    }
    out.push({ name: a.filename, content: content.toString('base64') });
  }
  return out.length > 0 ? out : undefined;
}
