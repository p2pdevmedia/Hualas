import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'ACTIVITY_DAY_NEW',
  'ACTIVITY_DAY_UPDATED',
  'ACTIVITY_DAY_CANCELLED',
  'ACTIVITY_DAY_REACTIVATED',
  'PICKUP_NOTICE_CREATED',
  'PICKUP_NOTICE_ACKNOWLEDGED',
  'PAYMENT_MANUAL_CREATED',
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'ACTIVITY_CAPACITY_FULL',
  'CHAT_MESSAGE_NEW',
  'NEWS_CREATED',
  'PROFESSOR_INVOICE_CREATED',
  'PROFESSOR_ACTIVITY_ASSIGNED',
  'PROFESSOR_GROUP_ASSIGNED',
] as const;

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export const subscriptionUpsertSchema = z.object({
  subscriberId: z.string().min(1),
  userAgent: z.string().max(500).optional(),
});

export const preferenceUpdateSchema = z.object({
  type: notificationTypeSchema,
  inApp: z.boolean(),
  push: z.boolean(),
});
