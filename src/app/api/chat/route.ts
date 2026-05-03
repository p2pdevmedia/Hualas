import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getProfessorChatContext } from '@/lib/chat/professor-chat-context';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roles = ((session.user as any).roles as string[] | undefined) ?? [];
  const isProfessor =
    roles.includes('PROFESSOR') || session.user.role === 'PROFESSOR';

  if (!isProfessor) {
    return NextResponse.json({
      activities: [],
      sharedParticipants: [],
    });
  }

  const context = await getProfessorChatContext(session.user.id);
  return NextResponse.json(context);
}
