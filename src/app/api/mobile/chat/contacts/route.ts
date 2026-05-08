import { NextResponse } from 'next/server';
import { getMobileMemberChatContacts } from '@/lib/chat/mobile-member-chat-context';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';

export async function GET(_req: Request) {
  const session = await getMobileSessionFromRequest(_req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const contacts = await getMobileMemberChatContacts(session.userId);

  return NextResponse.json({
    familyContacts: contacts.familyContacts,
    professorContacts: contacts.professorContacts,
    staffContacts: contacts.staffContacts,
  });
}
