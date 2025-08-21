import { z } from 'zod';

export const formFieldSchema = z.object({
  label: z.string(),
  type: z.enum(['text', 'number', 'select']),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional().default(false),
});

export const formCreateSchema = z.object({
  title: z.string(),
  fields: z.array(formFieldSchema),
});

export const formResponseSchema = z.object({
  data: z.record(z.string()),
});
