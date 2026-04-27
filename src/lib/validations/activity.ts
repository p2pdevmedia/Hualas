import { z } from 'zod';

export const activityCreateSchema = z.object({
  name: z.string(),
  date: z.string().transform((d) => new Date(d)),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME']),
  image: z.string().url().optional(),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
  capacity: z.number().int().positive().optional(),
  professorIds: z.array(z.string()).optional(),
});

export const activityDayCreateSchema = z.object({
  date: z.string().transform((d) => new Date(d)),
  schedule: z.string().min(1),
  description: z.string().optional(),
  geoLocation: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  professorIds: z.array(z.string().min(1)).min(1),
});

export const activityDayUpdateSchema = activityDayCreateSchema;

export const activityDayAttendanceSchema = z.object({
  participantId: z.string().min(1),
  status: z.enum(['PENDING', 'GOING', 'NOT_GOING']),
});
