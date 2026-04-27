import { z } from 'zod';
import { MOVEMENT_CATEGORIES } from '@/lib/accounting';

export const movementSchema = z.object({
  date: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.enum(MOVEMENT_CATEGORIES),
  description: z.string().trim().min(1).max(500),
  receiptNumber: z.string().trim().max(120).optional(),
});

export type MovementInput = z.infer<typeof movementSchema>;
