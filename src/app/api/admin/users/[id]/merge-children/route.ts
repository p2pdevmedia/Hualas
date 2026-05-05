import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getActivityParticipantKey } from '@/lib/activity-participants';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    survivorId: string;
    loserId: string;
    fieldChoices: Record<string, 'survivor' | 'loser'>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { survivorId, loserId, fieldChoices } = body;

  if (!survivorId || !loserId || survivorId === loserId) {
    return NextResponse.json(
      { error: 'Parámetros inválidos' },
      { status: 400 }
    );
  }

  const [survivor, loser] = await Promise.all([
    prisma.child.findFirst({
      where: { id: survivorId, userId: params.id },
      include: {
        activityParticipants: {
          select: {
            id: true,
            activityId: true,
            userId: true,
            participantKey: true,
          },
        },
        socialFeePayments: {
          select: { id: true, periodMonth: true, periodYear: true },
        },
        pickupNotices: {
          select: { id: true, activityDayId: true },
        },
      },
    }),
    prisma.child.findFirst({
      where: { id: loserId, userId: params.id },
      include: {
        activityParticipants: {
          select: {
            id: true,
            activityId: true,
            userId: true,
            participantKey: true,
          },
        },
        socialFeePayments: {
          select: { id: true, periodMonth: true, periodYear: true },
        },
        pickupNotices: {
          select: { id: true, activityDayId: true },
        },
      },
    }),
  ]);

  if (!survivor || !loser) {
    return NextResponse.json(
      { error: 'Hijos no encontrados' },
      { status: 404 }
    );
  }

  const survivorParticipantKeys = new Set(
    survivor.activityParticipants.map((p) => p.participantKey)
  );
  const survivorSocialFeeKeys = new Set(
    survivor.socialFeePayments.map((p) => `${p.periodMonth}:${p.periodYear}`)
  );
  const survivorPickupDayIds = new Set(
    survivor.pickupNotices.map((n) => n.activityDayId)
  );

  const MERGEABLE_FIELDS = [
    'name',
    'lastName',
    'documentType',
    'documentNumber',
    'documentFrontPhoto',
    'documentBackPhoto',
    'birthDate',
    'address',
    'gender',
    'nationality',
    'maritalStatus',
    'allergies',
    'regularMedication',
    'relevantDiseases',
    'previousInjuries',
    'physicalRestrictions',
    'bloodGroup',
    'primaryDoctor',
    'doctorPhone',
    'doctorCertificate',
    'profilePhoto',
    'observations',
  ];

  const [survivorFull, loserFull] = await Promise.all([
    prisma.child.findUnique({ where: { id: survivorId } }),
    prisma.child.findUnique({ where: { id: loserId } }),
  ]);

  if (!survivorFull || !loserFull) {
    return NextResponse.json(
      { error: 'Hijos no encontrados' },
      { status: 404 }
    );
  }

  const fieldUpdates: Record<string, unknown> = {};
  for (const field of MERGEABLE_FIELDS) {
    const survivorVal = (survivorFull as Record<string, unknown>)[field];
    const loserVal = (loserFull as Record<string, unknown>)[field];
    const choice = fieldChoices[field];

    if (choice === 'loser') {
      fieldUpdates[field] = loserVal;
    } else if (!survivorVal && loserVal) {
      fieldUpdates[field] = loserVal;
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const p of loser.activityParticipants) {
      const newKey = getActivityParticipantKey(
        p.activityId,
        p.userId,
        survivorId
      );
      if (survivorParticipantKeys.has(newKey)) {
        await tx.activityParticipant.delete({ where: { id: p.id } });
      } else {
        await tx.activityParticipant.update({
          where: { id: p.id },
          data: { childId: survivorId, participantKey: newKey },
        });
        survivorParticipantKeys.add(newKey);
      }
    }

    for (const payment of loser.socialFeePayments) {
      const key = `${payment.periodMonth}:${payment.periodYear}`;
      if (survivorSocialFeeKeys.has(key)) {
        await tx.socialFeePayment.delete({ where: { id: payment.id } });
      } else {
        await tx.socialFeePayment.update({
          where: { id: payment.id },
          data: { childId: survivorId },
        });
        survivorSocialFeeKeys.add(key);
      }
    }

    for (const notice of loser.pickupNotices) {
      if (survivorPickupDayIds.has(notice.activityDayId)) {
        await tx.pickupNotice.delete({ where: { id: notice.id } });
      } else {
        await tx.pickupNotice.update({
          where: { id: notice.id },
          data: { childId: survivorId },
        });
        survivorPickupDayIds.add(notice.activityDayId);
      }
    }

    if (Object.keys(fieldUpdates).length > 0) {
      await tx.child.update({
        where: { id: survivorId },
        data: fieldUpdates,
      });
    }

    await tx.child.delete({ where: { id: loserId } });
  });

  return NextResponse.json({ success: true, survivorId });
}
