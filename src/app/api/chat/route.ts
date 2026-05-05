import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getParentChatContext } from '@/lib/chat/parent-chat-context';
import { getProfessorChatContext } from '@/lib/chat/professor-chat-context';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roles = ((session.user as any).roles as string[] | undefined) ?? [];
  const isProfessor =
    roles.includes('PROFESSOR') || session.user.role === 'PROFESSOR';
  const isMember = roles.includes('MEMBER') || session.user.role === 'MEMBER';

  if (!isProfessor) {
    if (isMember) {
      const context = await getParentChatContext(session.user.id);
      return NextResponse.json(context);
    }

    return NextResponse.json({
      activities: [],
      sharedParticipants: [],
    });
  }

  const context = await getProfessorChatContext(session.user.id);
  return NextResponse.json(context);
}
