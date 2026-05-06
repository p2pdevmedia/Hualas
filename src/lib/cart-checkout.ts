import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActivityParticipantKey } from '@/lib/activity-participants';
import { getAccessibleChildrenWhere } from '@/lib/family-access';
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
  groupId?: string;
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

type DiscountSummary = {
  amount: number;
  label: string;
};

type MercadoPagoFeeLine = {
  amount: number;
  label: string;
};

export type CartQuote = {
  activityLines: ActivitySummary[];
  discountLines: DiscountSummary[];
  socialFeeLines: SocialFeeSummary[];
  mercadoPagoFeeLines: MercadoPagoFeeLine[];
  totalActivityAmount: number;
  totalDiscountAmount: number;
  totalSocialFeeAmount: number;
  totalMercadoPagoFeeAmount: number;
  totalAmount: number;
  totalAmountWithMercadoPagoFee: number;
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

function calculateAge(birthDate: Date, referenceDate: Date) {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function getActivityReferenceDate(activityDate: Date) {
  const today = new Date();
  return activityDate > today ? activityDate : today;
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
  const seenSelections = new Set<string>();
  for (const item of items) {
    const selectionKey = `${item.activityId}:${normalizeTarget(item.target) ?? 'self'}`;
    if (seenSelections.has(selectionKey)) {
      throw new CartQuoteError(
        409,
        'No podés agregar la misma actividad más de una vez para la misma inscripción.'
      );
    }
    seenSelections.add(selectionKey);
  }
  const activities = await prisma.activity.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      participants: { select: { id: true } },
      groups: {
        select: {
          id: true,
          name: true,
          capacity: true,
          minAge: true,
          maxAge: true,
          _count: { select: { members: true } },
        },
      },
    },
  });
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity])
  );

  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: { birthDate: true },
  });

  const selectedCountByGroupId = items.reduce((counts, item) => {
    if (item.groupId) {
      counts.set(item.groupId, (counts.get(item.groupId) ?? 0) + 1);
    }
    return counts;
  }, new Map<string, number>());

  for (const item of items) {
    const activity = activityById.get(item.activityId);
    if (!activity) {
      throw new CartQuoteError(404, 'Una actividad no existe.');
    }

    const selectedGroup = item.groupId
      ? activity.groups.find((group) => group.id === item.groupId)
      : null;

    if (activity.groups.length > 0 && !selectedGroup) {
      throw new CartQuoteError(
        400,
        `Seleccioná un grupo válido para ${activity.name}.`
      );
    }

    if (
      selectedGroup?.capacity != null &&
      selectedGroup._count.members +
        (selectedCountByGroupId.get(selectedGroup.id) ?? 0) >
        selectedGroup.capacity
    ) {
      throw new CartQuoteError(
        409,
        `El grupo ${selectedGroup.name} no tiene cupo.`
      );
    }

    const activityCapacity =
      activity.groups.length === 0 ||
      activity.groups.some((g) => g.capacity == null)
        ? null
        : activity.groups.reduce((sum, g) => sum + (g.capacity as number), 0);

    if (
      activityCapacity != null &&
      activity.participants.length >= activityCapacity
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
          ...(await getAccessibleChildrenWhere(userId)),
        },
        select: {
          id: true,
          name: true,
          lastName: true,
          birthDate: true,
        },
      })
    : [];

  const childById = new Map(children.map((child) => [child.id, child]));
  for (const target of childTargets) {
    if (!childById.has(target)) {
      throw new CartQuoteError(
        403,
        'Una de las personas seleccionadas no pertenece a tu familia.'
      );
    }
  }

  for (const item of items) {
    const activity = activityById.get(item.activityId)!;
    const selectedGroup = item.groupId
      ? activity.groups.find((group) => group.id === item.groupId)
      : null;

    if (!selectedGroup) continue;

    const childId = normalizeTarget(item.target);
    const birthDate = childId
      ? (childById.get(childId)?.birthDate ?? null)
      : (userProfile?.birthDate ?? null);

    if (!birthDate) {
      throw new CartQuoteError(
        422,
        'La persona seleccionada no tiene fecha de nacimiento cargada.'
      );
    }

    const age = calculateAge(
      birthDate,
      getActivityReferenceDate(activity.date)
    );

    if (selectedGroup.minAge != null && age < selectedGroup.minAge) {
      throw new CartQuoteError(
        400,
        `${item.targetLabel ?? 'La persona seleccionada'} no alcanza la edad mínima del grupo ${selectedGroup.name}.`
      );
    }

    if (selectedGroup.maxAge != null && age > selectedGroup.maxAge) {
      throw new CartQuoteError(
        400,
        `${item.targetLabel ?? 'La persona seleccionada'} supera la edad máxima del grupo ${selectedGroup.name}.`
      );
    }
  }

  const distinctChildIds = new Set(childTargets);

  const participantKeys = items.map((item) =>
    getActivityParticipantKey(
      item.activityId,
      userId,
      normalizeTarget(item.target)
    )
  );
  const existingParticipants = await prisma.activityParticipant.findMany({
    where: {
      OR: [
        { participantKey: { in: participantKeys } },
        ...items
          .map((item) => ({
            activityId: item.activityId,
            childId: normalizeTarget(item.target),
          }))
          .filter((item): item is { activityId: string; childId: string } =>
            Boolean(item.childId)
          ),
      ],
    },
    select: {
      participantKey: true,
      activity: { select: { name: true } },
    },
  });

  if (existingParticipants.length > 0) {
    const repeatedActivityName = existingParticipants[0]?.activity.name;
    throw new CartQuoteError(
      409,
      repeatedActivityName
        ? `Ya existe una inscripción para ${repeatedActivityName}.`
        : 'Ya existe una inscripción para una de las actividades seleccionadas.'
    );
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

  const childActivityAmount = items.reduce((sum, item) => {
    const childId = normalizeTarget(item.target);
    if (!childId) {
      return sum;
    }

    const activity = activityById.get(item.activityId);
    return sum + (activity ? Number(activity.price) : 0);
  }, 0);

  const totalDiscountAmount =
    distinctChildIds.size >= 2 ? Math.round(childActivityAmount * 0.1) : 0;

  const discountLines: DiscountSummary[] =
    totalDiscountAmount > 0
      ? [{ amount: totalDiscountAmount, label: 'Descuento familiar' }]
      : [];

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

  const totalAmount =
    totalActivityAmount - totalDiscountAmount + totalSocialFeeAmount;
  const totalMercadoPagoFeeAmount = Math.round(totalAmount * 0.1);
  const mercadoPagoFeeLines: MercadoPagoFeeLine[] =
    totalMercadoPagoFeeAmount > 0
      ? [
          {
            amount: totalMercadoPagoFeeAmount,
            label: 'Cargos de servicios externos Mercado Libre',
          },
        ]
      : [];

  return {
    activityLines,
    discountLines,
    socialFeeLines,
    mercadoPagoFeeLines,
    totalActivityAmount,
    totalDiscountAmount,
    totalSocialFeeAmount,
    totalMercadoPagoFeeAmount,
    totalAmount,
    totalAmountWithMercadoPagoFee: totalAmount + totalMercadoPagoFeeAmount,
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

  const discountItems = quote.discountLines.map((line, index) => ({
    id: `discount:${index}`,
    title: line.label,
    quantity: 1,
    unit_price: -line.amount,
    currency_id: 'ARS' as const,
    category_id: 'services' as const,
  }));

  const feeItems = quote.mercadoPagoFeeLines.map((line, index) => ({
    id: `mp-fee:${index}`,
    title: line.label,
    quantity: 1,
    unit_price: line.amount,
    currency_id: 'ARS' as const,
    category_id: 'services' as const,
  }));

  return [...activityItems, ...discountItems, ...socialFeeItems, ...feeItems];
}
