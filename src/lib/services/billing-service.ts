import { BillableConceptCode } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const billingService = {
  generateMonthlyChargesForMember: async (memberId: string, month: number, year: number, amount = 0) =>
    prisma.memberMonthlyCharge.upsert({
      where: { memberId_periodMonth_periodYear_concept: { memberId, periodMonth: month, periodYear: year, concept: BillableConceptCode.SOCIAL_FEE } },
      create: { memberId, periodMonth: month, periodYear: year, concept: BillableConceptCode.SOCIAL_FEE, amount },
      update: {},
    }),
  getPendingChargesForFamily: async (familyGroupId: string, month: number, year: number) =>
    prisma.memberMonthlyCharge.findMany({ where: { periodMonth: month, periodYear: year, status: 'PENDING', member: { familyMemberships: { some: { familyGroupId } } } } }),
  markMemberMonthlyChargeAsPaid: (id: string, paymentId: string) =>
    prisma.memberMonthlyCharge.update({ where: { id }, data: { status: 'PAID', paymentId, paidAt: new Date() } }),
};
