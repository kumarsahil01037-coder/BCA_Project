import { z } from 'zod';

export const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  subject: z.string().min(1, 'Subject is required').max(500),
  bodyHtml: z.string().min(1, 'Body is required'),
  toField: z.string().min(1, 'To field is required').max(500),
  ccField: z.string().max(500).optional().nullable(),
});
export type TemplateInput = z.infer<typeof templateSchema>;

export const composeSchema = z.object({
  name: z.string().min(1).max(200),
  uploadId: z.string().min(1, 'Upload required'),
  toField: z.string().min(1, 'To field is required'),
  ccField: z.string().optional().nullable(),
  subject: z.string().min(1, 'Subject is required'),
  bodyHtml: z.string().min(1, 'Body is required'),
  fromEmail: z.string().email(),
  fromName: z.string().optional().nullable(),
  fixedAttachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().optional(),
        base64: z.string().optional(),
        mime: z.string(),
        size: z.number(),
      }),
    )
    .default([]),
  dynamicAttachmentCol: z.string().optional().nullable(),
});
export type ComposeInput = z.infer<typeof composeSchema>;
