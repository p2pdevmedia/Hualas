import { prisma } from '@/lib/prisma';
import type { NotificationType } from '@prisma/client';

export type Preference = { inApp: boolean; push: boolean };

const DEFAULT_PREFERENCE: Preference = { inApp: true, push: true };

export async function resolvePreferences(
  userIds: string[],
  type: NotificationType
): Promise<Map<string, Preference>> {
  const result = new Map<string, Preference>();
  if (userIds.length === 0) return result;
  for (const id of userIds) result.set(id, { ...DEFAULT_PREFERENCE });

  const rows = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds }, type },
    select: { userId: true, inApp: true, push: true },
  });
  for (const row of rows) {
    result.set(row.userId, { inApp: row.inApp, push: row.push });
  }
  return result;
}

export async function getPreferenceMap(
  userId: string
): Promise<Record<NotificationType, Preference>> {
  const rows = await prisma.notificationPreference.findMany({
    where: { userId },
    select: { type: true, inApp: true, push: true },
  });
  const map = {} as Record<NotificationType, Preference>;
  for (const row of rows) {
    map[row.type] = { inApp: row.inApp, push: row.push };
  }
  return map;
}
