import { NextResponse } from 'next/server';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { formatAmount } from '@/lib/accounting';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatFullName, formatMobileDate } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole === 'PROFESSOR') {
    const profile = await prisma.professorProfile.findUnique({
      where: { userId: session.userId },
      include: {
        payments: {
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        },
      },
    });

    return NextResponse.json({
      role: 'PROFESSOR',
      profile: profile
        ? {
            id: profile.id,
            monthlySalary: profile.monthlySalary,
            bankName: profile.bankName,
            cbu: profile.cbu,
            alias: profile.alias,
            cuit: profile.cuit,
            notes: profile.notes,
          }
        : null,
      payments: profile?.payments.map((payment) => ({
        id: payment.id,
        kind: 'PROFESSOR',
        periodMonth: payment.periodMonth,
        periodYear: payment.periodYear,
        amount: payment.amount,
        amountLabel: formatAmount(payment.amount),
        status: payment.status,
        paidAt: formatMobileDate(payment.paidAt),
        notes: payment.notes,
      })) ?? [],
    });
  }

  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(session.userId);
  const [activityPayments, manualPayments] = await Promise.all([
    prisma.activityParticipant.findMany({
      where: {
        OR: [
          { userId: session.userId },
          { child: { userId: { in: accessibleChildOwnerIds } } },
        ],
        receipt: { not: null },
      },
      orderBy: { receiptDate: 'desc' },
      include: {
        activity: { select: { name: true, price: true } },
        user: { select: { name: true, lastName: true } },
        child: { select: { name: true, lastName: true } },
      },
    }),
    prisma.payment.findMany({
      where: {
        provider: 'MANUAL_TRANSFER',
        order: { responsibleUserId: session.userId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            items: {
              select: {
                description: true,
                billableConcept: { select: { code: true } },
                activity: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const combined = [
    ...activityPayments.map((payment) => {
      const participant = payment.child ?? payment.user;
      return {
        id: payment.id,
        kind: 'ACTIVITY',
        status: 'APPROVED',
        date: formatMobileDate(payment.receiptDate),
        title: payment.activity.name,
        subtitle: formatFullName(participant),
        reference: payment.receipt,
        amount: payment.activity.price,
        amountLabel: formatAmount(payment.activity.price),
      };
    }),
    ...manualPayments.map((payment) => {
      const activityNames = payment.order.items
        .filter((item) => item.billableConcept.code === 'ACTIVITY_FEE')
        .map((item) => item.activity?.name ?? item.description)
        .filter((name): name is string => Boolean(name));

      return {
        id: payment.id,
        kind: 'MANUAL_TRANSFER',
        status: payment.status,
        date: formatMobileDate(payment.paidAt ?? payment.updatedAt ?? payment.createdAt),
        title: activityNames.length > 0 ? activityNames.join(', ') : 'Sin actividad',
        subtitle: null,
        reference: null,
        amount: payment.amount,
        amountLabel: formatAmount(payment.amount),
      };
    }),
  ].sort((a, b) => {
    const aDate = a.date ? new Date(a.date).getTime() : 0;
    const bDate = b.date ? new Date(b.date).getTime() : 0;
    return bDate - aDate;
  });

  return NextResponse.json({
    role: 'MEMBER',
    payments: combined,
  });
}
