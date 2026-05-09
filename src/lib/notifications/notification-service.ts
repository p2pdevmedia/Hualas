import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { dispatch } from './dispatcher';
import {
  recipientsForActivityDay,
  recipientsForActivityDayUpdate,
  recipientsForActivityDayCancellation,
  recipientsForPickupNotice,
  recipientsForPickupNoticeAcknowledged,
  recipientsForManualMovement,
  recipientsForOrderPayment,
  recipientsForActivityParticipant,
  recipientsForCapacityFull,
  recipientsForChatMessage,
  recipientsForNews,
  recipientsForProfessorInvoice,
} from './recipients';

function logFailure(label: string, err: unknown): void {
  console.error(`[notifications] ${label} failed`, err);
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(cents);
}

export async function notifyProfessorActivityAssigned(
  activityId: string,
  professorIds: string[]
): Promise<void> {
  try {
    const recipients = [...new Set(professorIds)].filter(Boolean);
    if (recipients.length === 0) return;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, name: true, date: true },
    });
    if (!activity) return;

    await dispatch({
      type: 'PROFESSOR_ACTIVITY_ASSIGNED',
      recipients,
      title: `Te asignaron a ${activity.name}`,
      body: `Ya figurás como profesor/a de esta actividad desde el ${formatDate(activity.date)}.`,
      url: `/activities/${activity.id}`,
      data: { activityId: activity.id } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyProfessorActivityAssigned', err);
  }
}

export async function notifyProfessorGroupAssigned(
  activityId: string,
  groupId: string,
  professorIds: string[]
): Promise<void> {
  try {
    const recipients = [...new Set(professorIds)].filter(Boolean);
    if (recipients.length === 0) return;

    const group = await prisma.activityGroup.findFirst({
      where: { id: groupId, activityId },
      select: {
        id: true,
        name: true,
        activityId: true,
        activity: { select: { name: true } },
      },
    });
    if (!group) return;

    await dispatch({
      type: 'PROFESSOR_GROUP_ASSIGNED',
      recipients,
      title: `Te asignaron al grupo ${group.name}`,
      body: `Grupo de ${group.activity.name}. Revisá el calendario y los inscriptos asignados.`,
      url: `/activities/${group.activityId}/groups/${group.id}`,
      data: {
        activityId: group.activityId,
        groupId: group.id,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyProfessorGroupAssigned', err);
  }
}

export async function notifyActivityDayCreated(dayId: string): Promise<void> {
  try {
    const day = await prisma.activityDay.findUnique({
      where: { id: dayId },
      select: {
        id: true,
        date: true,
        activityId: true,
        activity: { select: { name: true } },
      },
    });
    if (!day) return;
    const recipients = await recipientsForActivityDay(dayId);
    if (recipients.length === 0) return;
    await dispatch({
      type: 'ACTIVITY_DAY_NEW',
      recipients,
      title: `Nuevo día — ${day.activity.name}`,
      body: `Se agregó un día el ${formatDate(day.date)}.`,
      url: `/activities/${day.activityId}`,
      data: { dayId: day.id, activityId: day.activityId } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyActivityDayCreated', err);
  }
}

export async function notifyActivityDayUpdated(dayId: string): Promise<void> {
  try {
    const day = await prisma.activityDay.findUnique({
      where: { id: dayId },
      select: {
        id: true,
        date: true,
        activityId: true,
        activity: { select: { name: true } },
      },
    });
    if (!day) return;
    const recipients = await recipientsForActivityDayUpdate(dayId);
    if (recipients.length === 0) return;
    await dispatch({
      type: 'ACTIVITY_DAY_UPDATED',
      recipients,
      title: `Día actualizado — ${day.activity.name}`,
      body: `Se actualizó un día (${formatDate(day.date)}). Revisá los detalles.`,
      url: `/activities/${day.activityId}`,
      data: { dayId: day.id, activityId: day.activityId } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyActivityDayUpdated', err);
  }
}

export async function notifyActivityDayCancelled(dayId: string): Promise<void> {
  try {
    const day = await prisma.activityDay.findUnique({
      where: { id: dayId },
      select: {
        id: true,
        date: true,
        activityId: true,
        cancellationReason: true,
        activity: { select: { name: true } },
      },
    });
    if (!day) return;
    const recipients = await recipientsForActivityDayCancellation(dayId);
    if (recipients.length === 0) return;
    const reason = day.cancellationReason
      ? ` Motivo: ${day.cancellationReason}`
      : '';
    await dispatch({
      type: 'ACTIVITY_DAY_CANCELLED',
      recipients,
      title: `Día cancelado — ${day.activity.name}`,
      body: `El día ${formatDate(day.date)} fue cancelado.${reason}`,
      url: `/activities/${day.activityId}`,
      data: { dayId: day.id, activityId: day.activityId } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyActivityDayCancelled', err);
  }
}

export async function notifyActivityDayReactivated(
  dayId: string
): Promise<void> {
  try {
    const day = await prisma.activityDay.findUnique({
      where: { id: dayId },
      select: {
        id: true,
        date: true,
        activityId: true,
        activity: { select: { name: true } },
      },
    });
    if (!day) return;
    const recipients = await recipientsForActivityDayCancellation(dayId);
    if (recipients.length === 0) return;
    await dispatch({
      type: 'ACTIVITY_DAY_REACTIVATED',
      recipients,
      title: `Día reactivado — ${day.activity.name}`,
      body: `El día ${formatDate(day.date)} vuelve a estar activo.`,
      url: `/activities/${day.activityId}`,
      data: { dayId: day.id, activityId: day.activityId } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyActivityDayReactivated', err);
  }
}

export async function notifyPickupNoticeCreated(
  noticeId: string
): Promise<void> {
  try {
    const notice = await prisma.pickupNotice.findUnique({
      where: { id: noticeId },
      select: {
        id: true,
        child: { select: { name: true, lastName: true } },
        activityDay: {
          select: {
            date: true,
            activityId: true,
            activity: { select: { name: true } },
          },
        },
      },
    });
    if (!notice) return;
    const recipients = await recipientsForPickupNotice(noticeId);
    if (recipients.length === 0) return;
    const childName = `${notice.child.name}${notice.child.lastName ? ' ' + notice.child.lastName : ''}`;
    await dispatch({
      type: 'PICKUP_NOTICE_CREATED',
      recipients,
      title: `Aviso de retiro — ${childName}`,
      body: `${notice.activityDay.activity.name} (${formatDate(notice.activityDay.date)}).`,
      url: `/my-activities`,
      data: {
        noticeId: notice.id,
        activityId: notice.activityDay.activityId,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyPickupNoticeCreated', err);
  }
}

export async function notifyPickupNoticeAcknowledged(
  ackId: string
): Promise<void> {
  try {
    const ack = await prisma.pickupNoticeAcknowledgment.findUnique({
      where: { id: ackId },
      select: {
        id: true,
        acknowledgedBy: { select: { name: true, lastName: true } },
        pickupNotice: {
          select: {
            id: true,
            child: { select: { name: true, lastName: true } },
          },
        },
      },
    });
    if (!ack) return;
    const recipients = await recipientsForPickupNoticeAcknowledged(ackId);
    if (recipients.length === 0) return;
    const profName =
      `${ack.acknowledgedBy.name ?? ''}${ack.acknowledgedBy.lastName ? ' ' + ack.acknowledgedBy.lastName : ''}`.trim();
    const childName = `${ack.pickupNotice.child.name}${ack.pickupNotice.child.lastName ? ' ' + ack.pickupNotice.child.lastName : ''}`;
    await dispatch({
      type: 'PICKUP_NOTICE_ACKNOWLEDGED',
      recipients,
      title: `Aviso confirmado — ${childName}`,
      body: profName
        ? `Confirmado por ${profName}.`
        : 'Confirmado por el profesor.',
      url: `/profile/pickup-notices`,
      data: {
        noticeId: ack.pickupNotice.id,
        ackId: ack.id,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyPickupNoticeAcknowledged', err);
  }
}

export async function notifyPaymentManualCreated(
  movementId: string
): Promise<void> {
  try {
    const movement = await prisma.accountingMovement.findUnique({
      where: { id: movementId },
      select: {
        id: true,
        type: true,
        amount: true,
        category: true,
        description: true,
      },
    });
    if (!movement) return;
    const recipients = await recipientsForManualMovement();
    if (recipients.length === 0) return;
    const sign = movement.type === 'INCOME' ? '+' : '-';
    await dispatch({
      type: 'PAYMENT_MANUAL_CREATED',
      recipients,
      title: `Movimiento manual — ${movement.category}`,
      body: `${sign}${formatAmount(movement.amount)} · ${movement.description}`,
      url: `/accounting/movements`,
      data: { movementId: movement.id } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyPaymentManualCreated', err);
  }
}

export async function notifyOrderPaymentApproved(
  paymentId: string
): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, amount: true, orderId: true },
    });
    if (!payment) return;
    const recipients = await recipientsForOrderPayment(paymentId);
    if (recipients.length === 0) return;
    await dispatch({
      type: 'PAYMENT_APPROVED',
      recipients,
      title: 'Pago aprobado',
      body: `Tu pago de ${formatAmount(payment.amount)} fue aprobado.`,
      url: `/profile`,
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyOrderPaymentApproved', err);
  }
}

export async function notifyManualPaymentApproved(
  paymentId: string
): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, amount: true, orderId: true },
    });
    if (!payment) return;
    const recipients = await recipientsForOrderPayment(paymentId);
    if (recipients.length === 0) return;
    await dispatch({
      type: 'PAYMENT_APPROVED',
      recipients,
      title: 'Pago manual aprobado',
      body: `Tu pago manual de ${formatAmount(payment.amount)} fue aprobado.`,
      url: `/profile/payments?manual-payment=approved`,
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyManualPaymentApproved', err);
  }
}

export async function notifyManualPaymentRejected(
  paymentId: string
): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, amount: true, orderId: true },
    });
    if (!payment) return;
    const recipients = await recipientsForOrderPayment(paymentId);
    if (recipients.length === 0) return;
    await dispatch({
      type: 'PAYMENT_REJECTED',
      recipients,
      title: 'Pago manual rechazado',
      body: `Tu pago manual de ${formatAmount(payment.amount)} fue rechazado.`,
      url: `/profile/payments?manual-payment=rejected`,
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyManualPaymentRejected', err);
  }
}

export async function notifyOrderPaymentRejected(
  paymentId: string
): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, amount: true, orderId: true },
    });
    if (!payment) return;
    const recipients = await recipientsForOrderPayment(paymentId);
    if (recipients.length === 0) return;
    await dispatch({
      type: 'PAYMENT_REJECTED',
      recipients,
      title: 'Pago rechazado',
      body: `Tu pago de ${formatAmount(payment.amount)} no pudo procesarse.`,
      url: `/profile`,
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyOrderPaymentRejected', err);
  }
}

export async function notifyActivityPaymentApproved(
  participantId: string
): Promise<void> {
  try {
    const participant = await prisma.activityParticipant.findUnique({
      where: { id: participantId },
      select: {
        id: true,
        activityId: true,
        activity: { select: { name: true, price: true } },
      },
    });
    if (!participant) return;
    const recipients = await recipientsForActivityParticipant(participantId);
    if (recipients.length === 0) return;
    await dispatch({
      type: 'PAYMENT_APPROVED',
      recipients,
      title: 'Inscripción confirmada',
      body: `Tu inscripción a ${participant.activity.name} fue confirmada.`,
      url: `/activities/${participant.activityId}`,
      data: {
        participantId: participant.id,
        activityId: participant.activityId,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyActivityPaymentApproved', err);
  }
}

export async function notifyActivityCapacityFull(
  activityId: string
): Promise<void> {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, name: true },
    });
    if (!activity) return;
    const recipients = await recipientsForCapacityFull();
    if (recipients.length === 0) return;
    await dispatch({
      type: 'ACTIVITY_CAPACITY_FULL',
      recipients,
      title: `Cupo completo — ${activity.name}`,
      body: `La actividad alcanzó su capacidad máxima.`,
      url: `/activities/${activity.id}`,
      data: { activityId: activity.id } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyActivityCapacityFull', err);
  }
}

export async function notifyProfessorInvoiceCreated(
  invoiceId: string
): Promise<void> {
  try {
    const invoice = await prisma.professorInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        professorId: true,
        originalName: true,
        professor: { select: { name: true, lastName: true } },
      },
    });
    if (!invoice) return;
    const recipients = await recipientsForProfessorInvoice();
    if (recipients.length === 0) return;
    const professorName =
      `${invoice.professor.name ?? ''}${invoice.professor.lastName ? ' ' + invoice.professor.lastName : ''}`.trim() ||
      'Un profesor';
    await dispatch({
      type: 'PROFESSOR_INVOICE_CREATED',
      recipients,
      title: `Nueva factura — ${professorName}`,
      body: `Se recibió la factura ${invoice.originalName}.`,
      url: `/accounting/professors/${invoice.professorId}`,
      data: {
        invoiceId: invoice.id,
        professorId: invoice.professorId,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyProfessorInvoiceCreated', err);
  }
}

export async function notifyProfessorPaymentPaid(
  paymentId: string
): Promise<void> {
  try {
    const payment = await prisma.professorPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        periodMonth: true,
        periodYear: true,
        professorProfile: {
          select: { userId: true },
        },
      },
    });
    if (!payment) return;
    const monthNames = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const period = `${monthNames[payment.periodMonth - 1]} ${payment.periodYear}`;
    await dispatch({
      type: 'PAYMENT_APPROVED',
      recipients: [payment.professorProfile.userId],
      title: 'Pago acreditado',
      body: `Tu pago de ${formatAmount(payment.amount)} (${period}) fue acreditado.`,
      url: `/my-payments`,
      data: { paymentId: payment.id } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyProfessorPaymentPaid', err);
  }
}

export async function notifyProfessorPaymentCancelled(
  paymentId: string
): Promise<void> {
  try {
    const payment = await prisma.professorPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        periodMonth: true,
        periodYear: true,
        professorProfile: {
          select: { userId: true },
        },
      },
    });
    if (!payment) return;
    const professorUserId = payment.professorProfile.userId;
    const monthNames = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const period = `${monthNames[payment.periodMonth - 1]} ${payment.periodYear}`;
    await dispatch({
      type: 'PAYMENT_REJECTED',
      recipients: [professorUserId],
      title: 'Pago rechazado',
      body: `Tu pago de ${formatAmount(payment.amount)} (${period}) fue rechazado por contaduría.`,
      url: `/my-payments`,
      data: { paymentId: payment.id } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyProfessorPaymentCancelled', err);
  }
}

export async function notifyChatMessage(messageId: string): Promise<void> {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        body: true,
        senderId: true,
        sender: { select: { name: true, lastName: true } },
      },
    });
    if (!message) return;
    const info = await recipientsForChatMessage(messageId);
    if (!info || info.recipients.length === 0) return;
    const senderName =
      `${message.sender.name ?? ''}${message.sender.lastName ? ' ' + message.sender.lastName : ''}`.trim() ||
      'Alguien';
    const preview =
      message.body.length > 80 ? message.body.slice(0, 77) + '…' : message.body;
    await dispatch({
      type: 'CHAT_MESSAGE_NEW',
      recipients: info.recipients,
      title: `Mensaje de ${senderName}`,
      body: preview,
      url: `/chat?with=${info.senderId}`,
      data: {
        messageId: message.id,
        senderId: info.senderId,
        conversationId: info.conversationId,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyChatMessage', err);
  }
}

export async function notifyNewsCreated(newsId: string): Promise<void> {
  try {
    const news = await prisma.news.findUnique({
      where: { id: newsId },
      select: {
        id: true,
        title: true,
        body: true,
        scope: true,
        activityId: true,
        activity: { select: { name: true } },
      },
    });
    if (!news) return;
    const recipients = await recipientsForNews(newsId);
    if (recipients.length === 0) return;
    const title =
      news.scope === 'ACTIVITY' && news.activity?.name
        ? `Noticia — ${news.activity.name}`
        : 'Noticia institucional';
    const preview =
      news.body.length > 120 ? `${news.body.slice(0, 117)}...` : news.body;
    await dispatch({
      type: 'NEWS_CREATED',
      recipients,
      title,
      body: `${news.title}: ${preview}`,
      url: `/news#${news.id}`,
      data: {
        newsId: news.id,
        activityId: news.activityId ?? null,
      } as Prisma.JsonObject,
    });
  } catch (err) {
    logFailure('notifyNewsCreated', err);
  }
}
