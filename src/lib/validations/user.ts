import { z } from 'zod';

export const userUpdateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'MEMBER']),
});
