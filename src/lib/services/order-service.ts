import { prisma } from '@/lib/prisma';

export const orderService = {
  createDraftOrder: (data: {
    familyGroupId?: string;
    responsibleUserId?: string;
    responsibleName: string;
    responsibleEmail: string;
    responsiblePhone?: string;
    periodMonth: number;
    periodYear: number;
  }) => prisma.order.create({ data }),
  addOrderItem: (
    orderId: string,
    item: {
      memberId?: string;
      activityId?: string;
      billableConceptId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      periodMonth: number;
      periodYear: number;
    }
  ) => prisma.orderItem.create({ data: { ...item, orderId } }),
  confirmOrder: (id: string) =>
    prisma.order.update({ where: { id }, data: { status: 'PENDING_PAYMENT' } }),
  cancelOrder: (id: string) =>
    prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } }),
  getOrderById: (id: string) =>
    prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true },
    }),
};
