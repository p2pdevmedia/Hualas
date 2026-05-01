import { prisma } from '@/lib/prisma';
import { Prisma, type NotificationType } from '@prisma/client';
import { resolvePreferences } from './preferences';
import { sendPushAlert, PushAlertError } from '@/lib/pushalert';

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
            const d = n.data as { senderId?: string; conversationId?: string } | null;
            return d?.senderId === senderId && d?.conversationId === conversationId;
          })
          .map((n) => n.userId),
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
