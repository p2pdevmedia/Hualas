import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import ChatClient from './chat-client';

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  return <ChatClient />;
}
