import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isCounterRole } from '@/lib/accounting';
import ChatClient from './chat-client';

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  if (isCounterRole(session.user.role)) {
    redirect('/accounting');
  }
  return <ChatClient />;
}
