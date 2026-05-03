import { z } from 'zod';

function parseDateInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

const dateInputSchema = z
  .string()
  .min(1)
  .transform((value, ctx) => {
    const parsed = parseDateInput(value);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fecha inválida',
      });
      return z.NEVER;
    }

    return parsed;
  });

const annualScheduleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  schedule: z.string().min(1),
  description: z.string().optional(),
  groupTempId: z.string().min(1).optional(),
  geoLocation: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
});

const annualScheduleEditSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  schedule: z.string().min(1),
  description: z.string().optional(),
  groupId: z.string().min(1).optional(),
  geoLocation: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
});

const activityGroupDraftSchema = z.object({
  tempId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

const activityBaseSchema = z.object({
  name: z.string(),
  date: dateInputSchema,
  endDate: dateInputSchema,
  activityType: z.enum(['TEMPORARY', 'ANNUAL']),
  frequency: z
    .enum(['DAILY', 'WEEKLY', 'MONTHLY', 'ONE_TIME'])
    .optional()
    .default('ONE_TIME'),
  image: z.string().url().optional(),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
  capacity: z.number().int().positive().optional(),
  professorIds: z.array(z.string()).optional(),
});

export const activityCreateSchema = activityBaseSchema
  .extend({
    groups: z.array(activityGroupDraftSchema).optional().default([]),
    annualSchedules: z.array(annualScheduleSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de fin no puede ser anterior a la de inicio',
        path: ['endDate'],
      });
    }

    if (data.activityType === 'ANNUAL') {
      if ((data.professorIds ?? []).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Las actividades anuales requieren al menos un profesor',
          path: ['professorIds'],
        });
      }

      if (data.annualSchedules.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Definí al menos una sesión semanal para la actividad anual',
          path: ['annualSchedules'],
        });
      }
    }

    if (data.activityType !== 'ANNUAL' && data.annualSchedules.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Las sesiones semanales solo aplican a actividades anuales',
        path: ['annualSchedules'],
      });
    }
  });

export const activityUpdateSchema = activityBaseSchema
  .extend({
    annualSchedules: z.array(annualScheduleEditSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de fin no puede ser anterior a la de inicio',
        path: ['endDate'],
      });
    }

    if (
      data.activityType === 'ANNUAL' &&
      (data.professorIds ?? []).length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Las actividades anuales requieren al menos un profesor',
        path: ['professorIds'],
      });
    }

    if (data.activityType === 'ANNUAL' && data.annualSchedules.length > 0) {
      for (let i = 0; i < data.annualSchedules.length; i++) {
        const s = data.annualSchedules[i];
        if (!s.schedule.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Completá el horario de la sesión ${i + 1}`,
            path: ['annualSchedules', i, 'schedule'],
          });
        }
        if (!s.geoLocation.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Completá la ubicación de la sesión ${i + 1}`,
            path: ['annualSchedules', i, 'geoLocation'],
          });
        }
      }
    }
  });

export const activityGroupCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const activityDayCreateSchema = z.object({
  date: z
    .string()
    .min(1)
    .transform((value, ctx) => {
      const parsed = parseDateInput(value);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Fecha inválida',
        });
        return z.NEVER;
      }

      return parsed;
    }),
  schedule: z.string().min(1),
  description: z.string().optional(),
  geoLocation: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  professorIds: z.array(z.string().min(1)).min(1),
  activityGroupId: z.string().min(1).nullable().optional(),
  sportIcon: z.string().optional().nullable(),
});

export const activityDayUpdateSchema = activityDayCreateSchema;

export const activityDayAttendanceSchema = z.object({
  participantId: z.string().min(1),
  status: z.enum(['PENDING', 'GOING', 'NOT_GOING']),
});
