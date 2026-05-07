import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';

export async function getNotificationUserIdFromRequest(req: Request) {
  const mobileSession = await getMobileSessionFromRequest(req);
  if (mobileSession) {
    return mobileSession.userId;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  return (session.user as { id: string }).id;
}
