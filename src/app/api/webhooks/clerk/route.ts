import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Missing CLERK_WEBHOOK_SECRET' }, { status: 500 });
  }

  const h = await headers();
  const svixId = h.get('svix-id');
  const svixTimestamp = h.get('svix-timestamp');
  const svixSignature = h.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse('Missing svix headers', { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(secret);
  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new NextResponse('Bad signature', { status: 400 });
  }

  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated': {
        const u = evt.data;
        const primaryEmail =
          u.email_addresses.find((e) => e.id === u.primary_email_address_id)?.email_address ??
          u.email_addresses[0]?.email_address;
        if (!primaryEmail) break;
        await prisma.user.upsert({
          where: { clerkId: u.id },
          update: {
            email: primaryEmail,
            firstName: u.first_name,
            lastName: u.last_name,
            imageUrl: u.image_url,
          },
          create: {
            clerkId: u.id,
            email: primaryEmail,
            firstName: u.first_name,
            lastName: u.last_name,
            imageUrl: u.image_url,
          },
        });
        break;
      }
      case 'user.deleted': {
        if (evt.data.id) {
          await prisma.user.deleteMany({ where: { clerkId: evt.data.id } });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
