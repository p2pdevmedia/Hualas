import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().optional(),
  lastName: z.string().optional(),
  dni: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z
    .enum(['FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED', 'OTHER'])
    .optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  maritalStatus: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});
