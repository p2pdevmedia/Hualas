import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import type { Role } from '@prisma/client';

export type NotificationRequestContext = {
  userId: string;
  activeRole: Role | null;
};

export async function getNotificationContextFromRequest(
  req: Request
): Promise<NotificationRequestContext | null> {
  const mobileSession = await getMobileSessionFromRequest(req);
  if (mobileSession) {
    return {
      userId: mobileSession.userId,
      activeRole: mobileSession.appRole,
    };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  const user = session.user as { id: string; activeRole?: Role | null };
  return {
    userId: user.id,
    activeRole: user.activeRole ?? null,
  };
}

export async function getNotificationUserIdFromRequest(req: Request) {
  const context = await getNotificationContextFromRequest(req);
  return context?.userId ?? null;
}
