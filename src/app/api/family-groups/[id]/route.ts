export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasAccountingApiAccess } from '@/lib/api-access';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAccounting = hasAccountingApiAccess(session);
  const data = await prisma.familyGroup.findFirst({
    where: isAccounting
      ? { id: params.id }
      : {
          id: params.id,
          OR: [
            { responsibleUserId: session.user.id },
            { members: { some: { memberId: session.user.id } } },
          ],
        },
    select: {
      id: true,
      name: true,
      responsibleUserId: true,
      responsibleName: true,
      responsibleEmail: true,
      responsiblePhone: true,
      members: {
        select: {
          id: true,
          memberId: true,
          relationship: true,
          isPaymentResponsible: true,
          member: {
            select: {
              id: true,
              name: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });
  if (!data) {
    return NextResponse.json(
      { error: isAccounting ? 'Not found' : 'Forbidden' },
      { status: isAccounting ? 404 : 403 }
    );
  }
  return NextResponse.json(data);
}
