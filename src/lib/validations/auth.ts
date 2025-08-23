import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(6),
  name: z.string().optional(),
});
