import { NextResponse } from 'next/server';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatFullName, formatMobileDateOnly } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'PROFESSOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const groupId = url.searchParams.get('groupId');

  const students = await prisma.activityParticipant.findMany({
    where: {
      status: 'ACTIVE',
      activity: {
        professors: { some: { userId: session.userId } },
      },
      ...(groupId
        ? {
            groupMembership: {
              activityGroupId: groupId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      userId: true,
      childId: true,
      participantKey: true,
      child: {
        select: {
          id: true,
          name: true,
          lastName: true,
          birthDate: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          lastName: true,
          birthDate: true,
        },
      },
      activity: {
        select: {
          id: true,
          name: true,
        },
      },
      groupMembership: {
        select: {
          activityGroupId: true,
          activityGroup: { select: { name: true } },
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          paymentReference: true,
          paidAt: true,
        },
        orderBy: { paidAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ activity: { name: 'asc' } }, { id: 'asc' }],
  });

  return NextResponse.json({
    students: students.map((student) => ({
      id: student.id,
      userId: student.userId,
      childId: student.childId,
      participantKey: student.participantKey,
      label: student.child
        ? formatFullName(student.child)
        : formatFullName(student.user),
      birthDate: formatMobileDateOnly(
        student.child?.birthDate ?? student.user.birthDate
      ),
      activity: student.activity,
      groupName: student.groupMembership?.activityGroup?.name ?? null,
      lastPayment: student.payments[0]
        ? {
            id: student.payments[0].id,
            amount: student.payments[0].amount,
            paymentReference: student.payments[0].paymentReference,
            paidAt: formatMobileDateOnly(student.payments[0].paidAt),
          }
        : null,
    })),
  });
}
