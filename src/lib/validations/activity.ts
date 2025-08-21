import { z } from 'zod';

export const activityCreateSchema = z.object({
  name: z.string(),
  date: z.string().transform((d) => new Date(d)),
  image: z.string().url().optional(),
  description: z.string().optional(),
});
