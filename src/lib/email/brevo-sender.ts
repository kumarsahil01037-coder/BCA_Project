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
 * Registers an email as a sender on the shared Brevo account and triggers
 * Brevo's ownership-verification email. Brevo allows multiple sender
 * entries with the same email, so check for an existing one first and
 * reuse it instead of creating a duplicate on every reconnect attempt.
 */
export async function createBrevoSender(email: string, name?: string | null): Promise<{ id: number }> {
  const existing = (await brevoFetch(`/senders?email=${encodeURIComponent(email)}`)) as {
    senders: { id: number; email: string }[];
  };
  const match = existing.senders.find((s) => s.email.toLowerCase() === email.toLowerCase());
  if (match) return { id: match.id };

  const created = (await brevoFetch('/senders', {
    method: 'POST',
    body: JSON.stringify({ name: name || email, email }),
  })) as { id: number };
  return created;
}

/** Removes a sender from the shared Brevo account so reconnecting sends a fresh verification email. */
export async function deleteBrevoSender(brevoSenderId: number): Promise<void> {
  await brevoFetch(`/senders/${brevoSenderId}`, { method: 'DELETE' });
}

/** Returns whether the given Brevo sender id has completed email verification. */
export async function getBrevoSenderVerified(brevoSenderId: number): Promise<boolean> {
  const result = (await brevoFetch('/senders')) as { senders: { id: number; active: boolean }[] };
  const match = result.senders.find((s) => s.id === brevoSenderId);
  return match?.active ?? false;
}

/** Submits the one-time code Brevo emailed to the sender address to complete verification. */
export async function validateBrevoSenderOtp(brevoSenderId: number, otp: string): Promise<void> {
  await brevoFetch(`/senders/${brevoSenderId}/validate`, {
    method: 'PUT',
    body: JSON.stringify({ otp: Number(otp) }),
  });
}

/**
 * Sends via the Brevo transactional email HTTPS API — works on hosts
 * that block outbound SMTP, using the app's shared Brevo account.
 */
export async function sendViaBrevo(
  args: SendArgs & { senderEmail: string; senderName?: string | null },
): Promise<{ messageId: string }> {
  const res = (await brevoFetch('/smtp/email', {
    method: 'POST',
    body: JSON.stringify({
      sender: { email: args.senderEmail, name: args.senderName || undefined },
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
