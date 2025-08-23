import { z } from 'zod';

export const childCreateSchema = z.object({
  name: z.string().min(1),
  lastName: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  gender: z
    .enum(['FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED', 'OTHER'])
    .optional(),
  nationality: z.string().optional(),
  maritalStatus: z.string().optional(),
  observations: z.string().optional(),
});
