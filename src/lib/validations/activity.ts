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
  tempId: z.string().min(1),
  weekday: z.number().int().min(0).max(6),
  schedule: z.string().min(1),
  groupTempId: z.string().min(1).optional(),
  professorIds: z.array(z.string().min(1)).min(1),
});

const annualScheduleEditSchema = z.object({
  tempId: z.string().min(1),
  weekday: z.number().int().min(0).max(6),
  schedule: z.string().min(1),
  groupId: z.string().min(1).optional(),
  professorIds: z.array(z.string().min(1)).min(1),
});

const activityGroupBaseShape = {
  name: z.string().min(1),
  description: z.string().optional(),
  capacity: z.number().int().positive(),
  minAge: z.number().int().nonnegative(),
  maxAge: z.number().int().nonnegative(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horario inválido'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horario inválido'),
};

const activityGroupBaseSchema = z
  .object(activityGroupBaseShape)
  .refine((data) => data.maxAge >= data.minAge, {
    message: 'La edad máxima debe ser mayor o igual a la mínima',
    path: ['maxAge'],
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'El horario de fin debe ser posterior al de inicio',
    path: ['endTime'],
  });

const activityGroupDraftSchema = z
  .object({
    tempId: z.string().min(1),
    ...activityGroupBaseShape,
  })
  .refine((data) => data.maxAge >= data.minAge, {
    message: 'La edad máxima debe ser mayor o igual a la mínima',
    path: ['maxAge'],
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'El horario de fin debe ser posterior al de inicio',
    path: ['endTime'],
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
  geoLocation: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  sportIcon: z.string().optional().nullable(),
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

      if (!data.geoLocation?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Definí una ubicación compartida para la actividad anual',
          path: ['geoLocation'],
        });
      }

      if (data.latitude == null || data.longitude == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Seleccioná un punto en el mapa para la actividad anual',
          path: ['latitude'],
        });
      }

      if (!data.sportIcon?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Seleccioná un deporte para la actividad anual',
          path: ['sportIcon'],
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

    if (data.activityType === 'ANNUAL') {
      if (!data.geoLocation?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Definí una ubicación compartida para la actividad anual',
          path: ['geoLocation'],
        });
      }

      if (data.latitude == null || data.longitude == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Seleccioná un punto en el mapa para la actividad anual',
          path: ['latitude'],
        });
      }

      if (!data.sportIcon?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Seleccioná un deporte para la actividad anual',
          path: ['sportIcon'],
        });
      }
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
      }
    }
  });

export const activityGroupCreateSchema = activityGroupBaseSchema;

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
