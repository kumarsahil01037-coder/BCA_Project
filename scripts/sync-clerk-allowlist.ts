import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { createClerkClient } from '@clerk/backend';
import { prisma } from '../src/lib/db/prisma';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function main() {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  const allowed = await prisma.allowedEmail.findMany({ select: { email: true } });
  const emails = new Set([...allowed.map((a) => a.email.toLowerCase()), ...ADMIN_EMAILS]);

  const { data: existing } = await clerk.allowlistIdentifiers.getAllowlistIdentifierList();
  const existingEmails = new Set(existing.map((i) => i.identifier.toLowerCase()));

  for (const email of emails) {
    if (existingEmails.has(email)) {
      console.log(`skip (already on Clerk allowlist): ${email}`);
      continue;
    }
    await clerk.allowlistIdentifiers.createAllowlistIdentifier({ identifier: email, notify: false });
    console.log(`added: ${email}`);
  }

  console.log('Done. Now enable "Allowlist" sign-up restriction in Clerk Dashboard → Configure → Restrictions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
