import { z } from 'zod';

export const activityCreateSchema = z.object({
  name: z.string(),
  date: z.string().transform((d) => new Date(d)),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME']),
  image: z.string().optional(),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
});
