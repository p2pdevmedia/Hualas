import { z } from 'zod';

export const userUpdateSchema = z.object({
  name: z.string().optional(),
  lastName: z.string().optional(),
  dni: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().optional().nullable()
  ),
  birthDate: z.string().optional(),
  gender: z
    .enum(['FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED', 'OTHER'])
    .optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  maritalStatus: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'PROFESSOR', 'SUPER_ADMIN']).optional(),
  observations: z.string().optional(),
  allergies: z.string().optional(),
  regularMedication: z.string().optional(),
  relevantDiseases: z.string().optional(),
  previousInjuries: z.string().optional(),
  physicalRestrictions: z.string().optional(),
  bloodGroup: z.string().optional(),
  primaryDoctor: z.string().optional(),
  doctorPhone: z.string().optional(),
  isActive: z.boolean().optional(),
});
