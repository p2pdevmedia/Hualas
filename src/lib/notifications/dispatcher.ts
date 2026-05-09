import { prisma } from '@/lib/prisma';
import { Prisma, type NotificationType, type Role } from '@prisma/client';
import { resolvePreferences } from './preferences';
import { sendPushAlert, PushAlertError } from '@/lib/pushalert';
import {
  sendMobilePushNotifications,
  type MobilePushDevice,
} from '@/lib/mobile-push';
import { isNotificationVisibleForActiveRole } from './visibility';

export type DispatchInput = {
  type: NotificationType;
  recipients: string[];
  title: string;
  body: string;
  url?: string | null;
  data?: Prisma.JsonObject | null;
};

export async function dispatch(input: DispatchInput): Promise<void> {
  const { type, recipients, title, body, url, data } = input;
  if (recipients.length === 0) return;

  const unique = [...new Set(recipients)];
  const prefs = await resolvePreferences(unique, type);

  let candidates = unique.filter((id) => {
    const p = prefs.get(id) ?? { inApp: true, push: true };
    return p.inApp || p.push;
  });
  if (candidates.length === 0) return;

  candidates = await filterCandidatesForActiveRole(
    candidates,
    type,
    url ?? null
  );
  if (candidates.length === 0) return;

  if (type === 'CHAT_MESSAGE_NEW' && data) {
    const senderId = (data as { senderId?: string }).senderId;
    const conversationId = (data as { conversationId?: string }).conversationId;
    if (senderId && conversationId) {
      const unread = await prisma.notification.findMany({
        where: {
          userId: { in: candidates },
          type: 'CHAT_MESSAGE_NEW',
          readAt: null,
        },
        select: { userId: true, data: true },
      });
      const skip = new Set(
        unread
          .filter((n) => {
            const d = n.data as {
              senderId?: string;
              conversationId?: string;
            } | null;
            return (
              d?.senderId === senderId && d?.conversationId === conversationId
            );
          })
          .map((n) => n.userId)
      );
      candidates = candidates.filter((id) => !skip.has(id));
    }
  }

  if (candidates.length === 0) return;

  const inAppUsers = candidates.filter((id) => prefs.get(id)?.inApp ?? true);
  if (inAppUsers.length > 0) {
    await prisma.notification.createMany({
      data: inAppUsers.map((userId) => ({
        userId,
        type,
        title,
        body,
        url: url ?? null,
        data: data ?? Prisma.JsonNull,
      })),
    });
  }

  const pushUsers = candidates.filter((id) => prefs.get(id)?.push ?? true);
  if (pushUsers.length === 0) return;

  let mobileDevices = await prisma.mobileDeviceToken.findMany({
    where: {
      userId: { in: pushUsers },
      revokedAt: null,
    },
    select: {
      id: true,
      token: true,
      environment: true,
      bundleId: true,
      userId: true,
      sessionId: true,
    },
  });
  mobileDevices = await filterMobileDevicesForActiveRole(
    mobileDevices,
    type,
    url ?? null
  );

  if (mobileDevices.length > 0) {
    const mobileResults = await sendMobilePushNotifications(
      mobileDevices.map(normalizeMobileDevice),
      {
        type,
        title,
        body,
        url: url ?? null,
        data: data ?? null,
      }
    );
    const revokedIds = mobileResults
      .filter((result) => shouldRevokeMobileToken(result.status, result.reason))
      .map((result) => result.deviceId);
    if (revokedIds.length > 0) {
      await prisma.mobileDeviceToken.updateMany({
        where: { id: { in: revokedIds } },
        data: { revokedAt: new Date() },
      });
    }
  }

  const subs = await prisma.pushAlertSubscription.findMany({
    where: { userId: { in: pushUsers }, failedAt: null },
    select: { id: true, subscriberId: true, userId: true },
  });
  if (subs.length === 0) return;

  const subscriberIds = [...new Set(subs.map((sub) => sub.subscriberId))];
  try {
    await sendPushAlert(subscriberIds, {
      title,
      message: body,
      url: url ?? undefined,
    });
    await prisma.pushAlertSubscription.updateMany({
      where: { subscriberId: { in: subscriberIds } },
      data: { lastUsedAt: new Date(), failedAt: null },
    });
  } catch (err) {
    console.error('[notifications] push delivery failed', {
      subscriberIds,
      reason: err instanceof Error ? err.message : err,
      status: err instanceof PushAlertError ? err.statusCode : undefined,
    });
  }
}

async function filterCandidatesForActiveRole(
  userIds: string[],
  type: NotificationType,
  url: string | null
): Promise<string[]> {
  const requiredNotification = { type, url };
  const hasRoleRequirement = !isNotificationVisibleForActiveRole(
    requiredNotification,
    null
  );
  if (!hasRoleRequirement) return userIds;

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isActive: true },
    select: { id: true, activeRole: true },
  });
  const activeRoles = new Map<string, Role>(
    users.map((user) => [user.id, user.activeRole])
  );

  return userIds.filter((userId) =>
    isNotificationVisibleForActiveRole(
      requiredNotification,
      activeRoles.get(userId) ?? null
    )
  );
}

async function filterMobileDevicesForActiveRole<
  T extends { sessionId: string | null },
>(devices: T[], type: NotificationType, url: string | null): Promise<T[]> {
  const requiredNotification = { type, url };
  const hasRoleRequirement = !isNotificationVisibleForActiveRole(
    requiredNotification,
    null
  );
  if (!hasRoleRequirement) return devices;

  const sessionIds = devices
    .map((device) => device.sessionId)
    .filter((sessionId): sessionId is string => Boolean(sessionId));
  if (sessionIds.length === 0) return [];

  const sessions = await prisma.mobileSession.findMany({
    where: {
      id: { in: sessionIds },
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, appRole: true },
  });
  const activeRoles = new Map<string, Role>(
    sessions.map((session) => [session.id, session.appRole])
  );

  return devices.filter(
    (device) =>
      device.sessionId &&
      isNotificationVisibleForActiveRole(
        requiredNotification,
        activeRoles.get(device.sessionId) ?? null
      )
  );
}

function normalizeMobileDevice(device: {
  id: string;
  token: string;
  environment: string | null;
  bundleId: string | null;
  userId: string;
}): MobilePushDevice {
  return {
    id: device.id,
    token: device.token,
    environment: device.environment,
    bundleId: device.bundleId,
    userId: device.userId,
  };
}

function shouldRevokeMobileToken(status?: number, reason?: string): boolean {
  if (!status) return false;
  if (status === 410 || status === 400) {
    return (
      reason === 'BadDeviceToken' ||
      reason === 'Unregistered' ||
      reason === 'DeviceTokenNotForTopic'
    );
  }
  return false;
}
