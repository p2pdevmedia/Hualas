import { z } from 'zod';

export const userUpdateSchema = z.object({
  name: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'SUPER_ADMIN']).optional(),
});
