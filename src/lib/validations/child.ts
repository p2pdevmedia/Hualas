import { z } from 'zod';

export const childCreateSchema = z.object({
  name: z.string().min(1),
  birthDate: z.string().optional(),
});
