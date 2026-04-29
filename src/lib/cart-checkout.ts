import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  getSocialFeeAmount,
  hasSocialFeeForCurrentMonth,
  normalizeSocialFeeParticipant,
  type SocialFeeParticipant,
} from '@/lib/social-fee';

export type CartCheckoutItem = {
  activityId: string;
  target?: string;
  targetLabel?: string;
};

type ActivitySummary = {
  id: string;
  name: string;
  amount: number;
  targetLabel: string;
};

type SocialFeeSummary = {
  participant: SocialFeeParticipant;
  amount: number;
  label: string;
};

export type CartQuote = {
  activityLines: ActivitySummary[];
  socialFeeLines: SocialFeeSummary[];
  totalActivityAmount: number;
  totalSocialFeeAmount: number;
  totalAmount: number;
  socialFeeAmount: number;
  socialFeeParticipants: SocialFeeParticipant[];
  validatedItems: CartCheckoutItem[];
};

type BuildCartQuoteInput = {
  userId: string;
  items: CartCheckoutItem[];
};

class CartQuoteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normalizeTarget(target?: string) {
  return !target || target === 'self' ? null : target;
}

export async function buildCartQuote({
  userId,
  items,
}: BuildCartQuoteInput): Promise<CartQuote> {
  if (!items.length) {
    throw new CartQuoteError(400, 'El carrito está vacío.');
  }

  const uniqueIds = [...new Set(items.map((item) => item.activityId))];
  const activities = await prisma.activity.findMany({
    where: { id: { in: uniqueIds } },
    include: { participants: { select: { id: true } } },
  });
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity])
  );

  for (const item of items) {
    const activity = activityById.get(item.activityId);
    if (!activity) {
      throw new CartQuoteError(404, 'Una actividad no existe.');
    }

    if (
      activity.capacity != null &&
      activity.participants.length >= activity.capacity
    ) {
      throw new CartQuoteError(
        409,
        `La actividad ${activity.name} no tiene cupo.`
      );
    }
  }

  const childTargets = [
    ...new Set(
      items
        .map((item) => normalizeTarget(item.target))
        .filter((target): target is string => Boolean(target))
    ),
  ];

  const children = childTargets.length
    ? await prisma.child.findMany({
        where: {
          id: { in: childTargets },
          userId,
        },
        select: {
          id: true,
          name: true,
          lastName: true,
        },
      })
    : [];

  const childById = new Map(children.map((child) => [child.id, child]));
  for (const target of childTargets) {
    if (!childById.has(target)) {
      throw new CartQuoteError(
        403,
        'Uno de los hijos seleccionados no pertenece al usuario.'
      );
    }
  }

  const activityLines = items.map((item) => {
    const activity = activityById.get(item.activityId)!;
    return {
      id: activity.id,
      name: activity.name,
      amount: Number(activity.price),
      targetLabel:
        item.targetLabel ?? (item.target === 'self' ? 'Para mí' : 'Menor'),
    };
  });

  const participantByKey = new Map<string, SocialFeeParticipant>();
  for (const item of items) {
    const childId = normalizeTarget(item.target);
    const participant = normalizeSocialFeeParticipant({
      userId,
      childId,
    });
    const key = `${participant.userId}:${participant.childId ?? 'self'}`;
    participantByKey.set(key, participant);
  }

  const socialFeeAmount = await getSocialFeeAmount();
  const socialFeeParticipants =
    socialFeeAmount > 0
      ? (
          await Promise.all(
            [...participantByKey.values()].map(async (participant) => ({
              participant,
              owesSocialFee: !(await hasSocialFeeForCurrentMonth(participant)),
            }))
          )
        )
          .filter((entry) => entry.owesSocialFee)
          .map((entry) => entry.participant)
      : [];

  const socialFeeLines: SocialFeeSummary[] = socialFeeParticipants.map(
    (participant) => ({
      participant,
      amount: socialFeeAmount,
      label: participant.childId
        ? 'Cuota social para hijo/a'
        : 'Cuota social para titular',
    })
  );

  const totalActivityAmount = activityLines.reduce(
    (sum, line) => sum + line.amount,
    0
  );
  const totalSocialFeeAmount = socialFeeLines.reduce(
    (sum, line) => sum + line.amount,
    0
  );

  return {
    activityLines,
    socialFeeLines,
    totalActivityAmount,
    totalSocialFeeAmount,
    totalAmount: totalActivityAmount + totalSocialFeeAmount,
    socialFeeAmount,
    socialFeeParticipants,
    validatedItems: items,
  };
}

export function buildCartQuoteErrorResponse(error: unknown) {
  if (error instanceof CartQuoteError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  return null;
}

export function toMercadoPagoItems(quote: CartQuote) {
  const activityItems = quote.activityLines.map((line) => ({
    id: line.id,
    title: line.name,
    quantity: 1,
    unit_price: line.amount,
    currency_id: 'ARS' as const,
    category_id: 'services' as const,
  }));

  const socialFeeItems = quote.socialFeeLines.map((line) => ({
    id: `social-fee:${line.participant.userId}:${line.participant.childId ?? 'self'}`,
    title: line.label,
    quantity: 1,
    unit_price: line.amount,
    currency_id: 'ARS' as const,
    category_id: 'services' as const,
  }));

  return [...activityItems, ...socialFeeItems];
}
