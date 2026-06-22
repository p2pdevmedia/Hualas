import { prisma } from '@/lib/prisma';
import { centsToPesos } from '@/lib/accounting';
import { getActivityParticipantKey } from '@/lib/activity-participants';
import {
  getAccessibleChildOwnerIds,
  getAccessibleChildrenWhere,
} from '@/lib/family-access';
import {
  getCurrentSocialFeePeriod,
  getSocialFeeAmount,
  getSocialFeePeriods,
  hasSocialFeeForPeriod,
  normalizeSocialFeeParticipant,
  type SocialFeeParticipant,
  type SocialFeePaymentLine,
  type SocialFeePeriod,
} from '@/lib/social-fee';

export type CartCheckoutItem = {
  activityId: string;
  target?: string;
  targetLabel?: string;
  groupId?: string;
  activityDayId?: string;
  activityDayLabel?: string;
};

type ActivitySummary = {
  id: string;
  name: string;
  amount: number;
  targetLabel: string;
  activityDayLabel?: string;
};

export type ActivityMonthlyPaymentLine = {
  activityParticipantId: string;
  activityId: string;
  activityName: string;
  userId: string;
  childId: string | null;
  targetLabel: string;
  amount: number;
  periodMonth: number;
  periodYear: number;
  label: string;
};

type SocialFeeSummary = {
  participant: SocialFeeParticipant;
  amount: number;
  label: string;
  periodMonth: number;
  periodYear: number;
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
  activityMonthlyPaymentLines: ActivityMonthlyPaymentLine[];
  discountLines: DiscountSummary[];
  socialFeeLines: SocialFeeSummary[];
  mercadoPagoFeeLines: MercadoPagoFeeLine[];
  totalActivityAmount: number;
  totalActivityMonthlyPaymentAmount: number;
  totalDiscountAmount: number;
  totalSocialFeeAmount: number;
  totalMercadoPagoFeeAmount: number;
  totalAmount: number;
  totalAmountWithMercadoPagoFee: number;
  socialFeeAmount: number;
  socialFeeParticipants: SocialFeeParticipant[];
  socialFeePaymentLines: SocialFeePaymentLine[];
  socialFeeMonths: number;
  validatedItems: CartCheckoutItem[];
};

type BuildCartQuoteInput = {
  userId: string;
  items: CartCheckoutItem[];
  socialFeeOnly?: boolean;
  socialFeeMonths?: number;
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

function getSocialFeeParticipantKey(participant: SocialFeeParticipant) {
  return participant.childId
    ? `child:${participant.childId}`
    : `user:${participant.userId}`;
}

function formatParticipantName(
  name: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string
) {
  return [name, lastName].filter(Boolean).join(' ') || fallback;
}

function formatSocialFeePeriod({ month, year }: SocialFeePeriod) {
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function getPeriodBounds({ month, year }: SocialFeePeriod) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    nextStart: new Date(Date.UTC(year, month, 1)),
  };
}

async function getActiveSocialFeeParticipants(userId: string) {
  const ownerIds = await getAccessibleChildOwnerIds(userId);
  const activeUsers = await prisma.user.findMany({
    where: {
      id: { in: ownerIds },
      isActive: true,
      socialFeeActive: true,
    },
    select: {
      id: true,
      name: true,
      lastName: true,
      children: {
        select: { id: true, name: true, lastName: true },
      },
    },
  });

  const participants: Array<{
    participant: SocialFeeParticipant;
    label: string;
  }> = [];
  for (const user of activeUsers) {
    participants.push({
      participant: normalizeSocialFeeParticipant({ userId: user.id }),
      label: `Titular: ${formatParticipantName(user.name, user.lastName, 'Socio')}`,
    });
    for (const child of user.children) {
      participants.push({
        participant: normalizeSocialFeeParticipant({
          userId: user.id,
          childId: child.id,
        }),
        label: `Hijo/a: ${formatParticipantName(child.name, child.lastName, child.name)}`,
      });
    }
  }

  return participants;
}

async function getPendingActivityMonthlyPaymentLines(
  userId: string
): Promise<ActivityMonthlyPaymentLine[]> {
  const ownerIds = await getAccessibleChildOwnerIds(userId);
  const period = getCurrentSocialFeePeriod();
  const periodBounds = getPeriodBounds(period);
  const participants = await prisma.activityParticipant.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { childId: null, userId: { in: ownerIds } },
        { childId: { not: null }, child: { userId: { in: ownerIds } } },
      ],
      activity: {
        activityType: 'ANNUAL',
        date: { lt: periodBounds.nextStart },
        endDate: { gte: periodBounds.start },
      },
    },
    select: {
      id: true,
      userId: true,
      childId: true,
      user: { select: { name: true, lastName: true } },
      child: { select: { name: true, lastName: true } },
      activity: { select: { id: true, name: true, price: true } },
      payments: {
        where: {
          paymentType: 'MONTHLY',
          periodMonth: period.month,
          periodYear: period.year,
        },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: [{ activity: { name: 'asc' } }, { id: 'asc' }],
  });

  return participants
    .filter(
      (participant) =>
        participant.payments.length === 0 &&
        Number(participant.activity.price) > 0
    )
    .map((participant) => {
      const targetLabel = participant.child
        ? formatParticipantName(
            participant.child.name,
            participant.child.lastName,
            'Hijo/a'
          )
        : formatParticipantName(
            participant.user.name,
            participant.user.lastName,
            'Titular'
          );
      const periodLabel = formatSocialFeePeriod(period);

      return {
        activityParticipantId: participant.id,
        activityId: participant.activity.id,
        activityName: participant.activity.name,
        userId: participant.userId,
        childId: participant.childId,
        targetLabel,
        amount: Number(participant.activity.price),
        periodMonth: period.month,
        periodYear: period.year,
        label: `${participant.activity.name} - ${targetLabel} - ${periodLabel}`,
      };
    });
}

export async function buildCartQuote({
  userId,
  items,
  socialFeeOnly = false,
  socialFeeMonths = 1,
}: BuildCartQuoteInput): Promise<CartQuote> {
  if (!items.length && !socialFeeOnly) {
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
  const activities = uniqueIds.length
    ? await prisma.activity.findMany({
        where: { id: { in: uniqueIds } },
        include: {
          participants: {
            where: { status: 'ACTIVE' },
            select: { id: true },
          },
          days: {
            where: { cancelled: false },
            select: {
              id: true,
              activityId: true,
              activityGroupId: true,
              date: true,
              schedule: true,
            },
          },
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
      })
    : [];
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

    const selectedActivityDay = item.activityDayId
      ? activity.days.find((day) => day.id === item.activityDayId)
      : null;
    const selectedGroupId =
      item.groupId ?? selectedActivityDay?.activityGroupId ?? undefined;
    const selectedGroup = selectedGroupId
      ? activity.groups.find((group) => group.id === selectedGroupId)
      : null;

    if (
      activity.groups.length > 0 &&
      !selectedGroup &&
      activity.activityType === 'ANNUAL'
    ) {
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

    if (activity.activityType !== 'ANNUAL' && activity.days.length > 0) {
      if (!selectedActivityDay) {
        throw new CartQuoteError(
          400,
          `Seleccioná una sesión válida para ${activity.name}.`
        );
      }

      if (
        item.groupId &&
        selectedActivityDay.activityGroupId &&
        selectedActivityDay.activityGroupId !== item.groupId
      ) {
        throw new CartQuoteError(
          400,
          `La sesión seleccionada no corresponde al grupo de ${activity.name}.`
        );
      }
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

  const participantKeys = items.map((item) =>
    getActivityParticipantKey(
      item.activityId,
      userId,
      normalizeTarget(item.target)
    )
  );
  const existingParticipants =
    participantKeys.length > 0
      ? await prisma.activityParticipant.findMany({
          where: {
            status: 'ACTIVE',
            OR: [
              { participantKey: { in: participantKeys } },
              ...items
                .map((item) => ({
                  activityId: item.activityId,
                  childId: normalizeTarget(item.target),
                }))
                .filter(
                  (item): item is { activityId: string; childId: string } =>
                    Boolean(item.childId)
                ),
            ],
          },
          select: {
            id: true,
            participantKey: true,
            activityId: true,
            activity: { select: { name: true } },
          },
        })
      : [];

  if (existingParticipants.length > 0) {
    const participantByKey = new Map(
      existingParticipants.map((participant) => [
        participant.participantKey,
        participant,
      ])
    );
    const potentiallyRepeatableTemporaryItems = items.filter((item) => {
      const key = getActivityParticipantKey(
        item.activityId,
        userId,
        normalizeTarget(item.target)
      );
      const participant = participantByKey.get(key);
      const activity = activityById.get(item.activityId);
      return (
        participant &&
        activity?.activityType !== 'ANNUAL' &&
        Boolean(item.activityDayId)
      );
    });

    const existingSessionPayments =
      potentiallyRepeatableTemporaryItems.length > 0
        ? await prisma.activityParticipantPayment.findMany({
            where: {
              OR: potentiallyRepeatableTemporaryItems
                .map((item) => {
                  const key = getActivityParticipantKey(
                    item.activityId,
                    userId,
                    normalizeTarget(item.target)
                  );
                  const participant = participantByKey.get(key);
                  return participant && item.activityDayId
                    ? {
                        activityParticipantId: participant.id,
                        activityDayId: item.activityDayId,
                      }
                    : null;
                })
                .filter(
                  (
                    entry
                  ): entry is {
                    activityParticipantId: string;
                    activityDayId: string;
                  } => Boolean(entry)
                ),
            },
            select: {
              activityParticipantId: true,
              activityDayId: true,
            },
          })
        : [];
    const paidSessionKeys = new Set(
      existingSessionPayments.map(
        (payment) => `${payment.activityParticipantId}:${payment.activityDayId}`
      )
    );

    for (const existingParticipant of existingParticipants) {
      const matchingItem = items.find((item) => {
        const key = getActivityParticipantKey(
          item.activityId,
          userId,
          normalizeTarget(item.target)
        );
        return key === existingParticipant.participantKey;
      });
      const activity = activityById.get(existingParticipant.activityId);
      const isRepeatableTemporary =
        activity?.activityType !== 'ANNUAL' &&
        Boolean(matchingItem?.activityDayId);
      if (
        isRepeatableTemporary &&
        matchingItem?.activityDayId &&
        !paidSessionKeys.has(
          `${existingParticipant.id}:${matchingItem.activityDayId}`
        )
      ) {
        continue;
      }

      throw new CartQuoteError(
        409,
        existingParticipant.activity.name
          ? `Ya existe una inscripción o pago para ${existingParticipant.activity.name}.`
          : 'Ya existe una inscripción o pago para una de las actividades seleccionadas.'
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
      activityDayLabel: item.activityDayLabel,
    };
  });

  const activityMonthlyPaymentLines =
    await getPendingActivityMonthlyPaymentLines(userId);

  const distinctChildIds = new Set(childTargets);
  for (const line of activityMonthlyPaymentLines) {
    if (line.childId) {
      distinctChildIds.add(line.childId);
    }
  }

  const childActivityAmount =
    items.reduce((sum, item) => {
      const childId = normalizeTarget(item.target);
      if (!childId) {
        return sum;
      }

      const activity = activityById.get(item.activityId);
      return sum + (activity ? Number(activity.price) : 0);
    }, 0) +
    activityMonthlyPaymentLines.reduce((sum, line) => {
      return sum + (line.childId ? line.amount : 0);
    }, 0);

  const totalDiscountAmount =
    distinctChildIds.size >= 2 ? Math.round(childActivityAmount * 0.1) : 0;

  const discountLines: DiscountSummary[] =
    totalDiscountAmount > 0
      ? [{ amount: totalDiscountAmount, label: 'Descuento familiar' }]
      : [];

  const participantByKey = new Map<
    string,
    { participant: SocialFeeParticipant; label: string }
  >();
  for (const item of items) {
    const childId = normalizeTarget(item.target);
    const participant = normalizeSocialFeeParticipant({
      userId,
      childId,
    });
    participantByKey.set(getSocialFeeParticipantKey(participant), {
      participant,
      label: item.targetLabel ?? (childId ? 'Hijo/a seleccionado' : 'Titular'),
    });
  }

  for (const participant of await getActiveSocialFeeParticipants(userId)) {
    participantByKey.set(
      getSocialFeeParticipantKey(participant.participant),
      participant
    );
  }

  const socialFeeAmount = await getSocialFeeAmount();
  const socialFeePeriods = getSocialFeePeriods(
    socialFeeOnly ? socialFeeMonths : 1
  );
  const socialFeePaymentLines =
    socialFeeAmount > 0
      ? (
          await Promise.all(
            [...participantByKey.values()].flatMap(({ participant, label }) =>
              socialFeePeriods.map(async (period) => ({
                participant,
                label,
                period,
                owesSocialFee: !(await hasSocialFeeForPeriod({
                  ...participant,
                  ...period,
                })),
              }))
            )
          )
        )
          .filter((entry) => entry.owesSocialFee)
          .map((entry) => ({
            ...entry.participant,
            month: entry.period.month,
            year: entry.period.year,
            amount: socialFeeAmount,
            label: entry.label,
          }))
      : [];

  const socialFeeParticipants = Array.from(
    new Map(
      socialFeePaymentLines.map((line) => [
        `${line.userId}:${line.childId ?? 'self'}`,
        { userId: line.userId, childId: line.childId },
      ])
    ).values()
  );

  const socialFeeLines: SocialFeeSummary[] = socialFeePaymentLines.map(
    (line) => {
      const participantKey = getSocialFeeParticipantKey(line);
      const participantLabel =
        participantByKey.get(participantKey)?.label ??
        (line.childId ? 'Hijo/a' : 'Titular');
      return {
        participant: { userId: line.userId, childId: line.childId },
        amount: line.amount,
        label: `${participantLabel} - ${formatSocialFeePeriod({
          month: line.month,
          year: line.year,
        })}`,
        periodMonth: line.month,
        periodYear: line.year,
      };
    }
  );

  const totalActivityAmount = activityLines.reduce(
    (sum, line) => sum + line.amount,
    0
  );
  const totalActivityMonthlyPaymentAmount = activityMonthlyPaymentLines.reduce(
    (sum, line) => sum + line.amount,
    0
  );
  const totalSocialFeeAmount = socialFeeLines.reduce(
    (sum, line) => sum + line.amount,
    0
  );

  const totalAmount =
    totalActivityAmount +
    totalActivityMonthlyPaymentAmount -
    totalDiscountAmount +
    totalSocialFeeAmount;
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
    activityMonthlyPaymentLines,
    discountLines,
    socialFeeLines,
    mercadoPagoFeeLines,
    totalActivityAmount,
    totalActivityMonthlyPaymentAmount,
    totalDiscountAmount,
    totalSocialFeeAmount,
    totalMercadoPagoFeeAmount,
    totalAmount,
    totalAmountWithMercadoPagoFee: totalAmount + totalMercadoPagoFeeAmount,
    socialFeeAmount,
    socialFeeParticipants,
    socialFeePaymentLines,
    socialFeeMonths: socialFeePeriods.length,
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

export function serializeActivityMonthlyPaymentLines(
  lines: ActivityMonthlyPaymentLine[]
) {
  return JSON.stringify(lines);
}

export function parseActivityMonthlyPaymentLines(
  value: unknown
): ActivityMonthlyPaymentLine[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const activityParticipantId =
          typeof (entry as { activityParticipantId?: unknown })
            .activityParticipantId === 'string'
            ? (entry as { activityParticipantId: string }).activityParticipantId
            : null;
        const activityId =
          typeof (entry as { activityId?: unknown }).activityId === 'string'
            ? (entry as { activityId: string }).activityId
            : null;
        const activityName =
          typeof (entry as { activityName?: unknown }).activityName === 'string'
            ? (entry as { activityName: string }).activityName
            : 'Actividad';
        const userId =
          typeof (entry as { userId?: unknown }).userId === 'string'
            ? (entry as { userId: string }).userId
            : null;
        const periodMonth = Number(
          (entry as { periodMonth?: unknown }).periodMonth
        );
        const periodYear = Number(
          (entry as { periodYear?: unknown }).periodYear
        );
        const amount = Number((entry as { amount?: unknown }).amount);
        if (
          !activityParticipantId ||
          !activityId ||
          !userId ||
          !Number.isInteger(periodMonth) ||
          periodMonth < 1 ||
          periodMonth > 12 ||
          !Number.isInteger(periodYear) ||
          periodYear < 2000 ||
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          return null;
        }

        const childId = (entry as { childId?: unknown }).childId;
        const targetLabel =
          typeof (entry as { targetLabel?: unknown }).targetLabel === 'string'
            ? (entry as { targetLabel: string }).targetLabel
            : typeof childId === 'string'
              ? 'Hijo/a'
              : 'Titular';
        const label =
          typeof (entry as { label?: unknown }).label === 'string'
            ? (entry as { label: string }).label
            : `${activityName} - ${targetLabel}`;

        return {
          activityParticipantId,
          activityId,
          activityName,
          userId,
          childId: typeof childId === 'string' ? childId : null,
          targetLabel,
          amount: Math.round(amount),
          periodMonth,
          periodYear,
          label,
        };
      })
      .filter((entry): entry is ActivityMonthlyPaymentLine => Boolean(entry));
  } catch {
    return [];
  }
}

export function toMercadoPagoItems(quote: CartQuote) {
  const activityItems = quote.activityLines.map((line) => ({
    id: line.id,
    title: line.name,
    quantity: 1,
    unit_price: centsToPesos(line.amount),
    currency_id: 'ARS' as const,
    category_id: 'services' as const,
  }));

  const activityMonthlyPaymentItems = quote.activityMonthlyPaymentLines.map(
    (line) => ({
      id: `activity-monthly:${line.activityParticipantId}:${line.periodYear}-${line.periodMonth}`,
      title: line.label,
      quantity: 1,
      unit_price: centsToPesos(line.amount),
      currency_id: 'ARS' as const,
      category_id: 'services' as const,
    })
  );

  const socialFeeItems = quote.socialFeeLines.map((line) => ({
    id: `social-fee:${line.participant.userId}:${line.participant.childId ?? 'self'}:${line.periodYear}-${line.periodMonth}`,
    title: line.label,
    quantity: 1,
    unit_price: centsToPesos(line.amount),
    currency_id: 'ARS' as const,
    category_id: 'services' as const,
  }));

  const discountItems = quote.discountLines.map((line, index) => ({
    id: `discount:${index}`,
    title: line.label,
    quantity: 1,
    unit_price: -centsToPesos(line.amount),
    currency_id: 'ARS' as const,
    category_id: 'services' as const,
  }));

  const feeItems = quote.mercadoPagoFeeLines.map((line, index) => ({
    id: `mp-fee:${index}`,
    title: line.label,
    quantity: 1,
    unit_price: centsToPesos(line.amount),
    currency_id: 'ARS' as const,
    category_id: 'services' as const,
  }));

  return [
    ...activityItems,
    ...activityMonthlyPaymentItems,
    ...discountItems,
    ...socialFeeItems,
    ...feeItems,
  ];
}
