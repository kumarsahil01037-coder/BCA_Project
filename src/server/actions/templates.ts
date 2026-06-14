'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/get-user';
import { templateSchema, type TemplateInput } from '@/lib/validators/schemas';
import { extractAllVariables } from '@/lib/email/template-engine';

export async function createTemplate(input: TemplateInput) {
  const user = await requireUser();
  const data = templateSchema.parse(input);
  const variables = extractAllVariables([data.toField, data.ccField, data.subject, data.bodyHtml]);

  const template = await prisma.template.create({
    data: {
      userId: user.id,
      name: data.name,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      toField: data.toField,
      ccField: data.ccField ?? null,
      variables,
    },
  });
  revalidatePath('/templates');
  return template;
}

export async function updateTemplate(id: string, input: TemplateInput) {
  const user = await requireUser();
  const data = templateSchema.parse(input);
  const variables = extractAllVariables([data.toField, data.ccField, data.subject, data.bodyHtml]);

  const template = await prisma.template.update({
    where: { id, userId: user.id },
    data: {
      name: data.name,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      toField: data.toField,
      ccField: data.ccField ?? null,
      variables,
    },
  });
  revalidatePath('/templates');
  return template;
}

export async function deleteTemplate(id: string) {
  const user = await requireUser();
  await prisma.template.delete({ where: { id, userId: user.id } });
  revalidatePath('/templates');
  return { ok: true };
}

export async function duplicateTemplate(id: string) {
  const user = await requireUser();
  const src = await prisma.template.findFirst({ where: { id, userId: user.id } });
  if (!src) throw new Error('Template not found');
  const copy = await prisma.template.create({
    data: {
      userId: user.id,
      name: `${src.name} (Copy)`,
      subject: src.subject,
      bodyHtml: src.bodyHtml,
      toField: src.toField,
      ccField: src.ccField,
      variables: src.variables,
    },
  });
  revalidatePath('/templates');
  return copy;
}

export async function listTemplates() {
  const user = await requireUser();
  return prisma.template.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  });
}
