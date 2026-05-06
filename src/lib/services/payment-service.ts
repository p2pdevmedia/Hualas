import { prisma } from '@/lib/prisma';
import {
  notifyOrderPaymentApproved,
  notifyOrderPaymentRejected,
} from '@/lib/notifications/notification-service';

export const paymentService = {
  createPaymentForOrder: (
    orderId: string,
    amount: number,
    provider: 'MANUAL_TRANSFER' | 'MERCADO_PAGO' | 'CASH' | 'OTHER'
  ) => prisma.payment.create({ data: { orderId, amount, provider } }),
  approvePayment: async (id: string) => {
    const now = new Date();
    const payment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: { status: 'APPROVED', paidAt: now },
      });
      const order = await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID', paidAt: now },
      });
      await tx.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: 'PAID' },
      });
      return payment;
    });
    notifyOrderPaymentApproved(payment.id);
    return payment;
  },
  rejectPayment: async (id: string) => {
    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
    notifyOrderPaymentRejected(payment.id);
    return payment;
  },
};
