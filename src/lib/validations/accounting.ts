import { z } from 'zod';
import { MOVEMENT_CATEGORIES } from '@/lib/accounting';

export const movementSchema = z.object({
  date: z.string().min(1),
  amount: z.number().int().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.enum(MOVEMENT_CATEGORIES),
  description: z.string().min(1).max(500),
  receiptNumber: z.string().optional(),
});

export type MovementInput = z.infer<typeof movementSchema>;
