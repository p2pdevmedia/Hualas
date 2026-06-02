import type { ManualPaymentRawData } from '@/lib/manual-payments';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

type PaymentDetailOrderItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  periodMonth: number;
  periodYear: number;
  billableConcept: {
    code: string;
  };
  activity: {
    name: string;
  } | null;
};

export type PaymentDetailLine = {
  id: string;
  concept: string;
  description: string;
  participantName: string;
  amount: number;
  periodLabel: string;
};

export function collectPaymentDetailChildIds(rawData: ManualPaymentRawData) {
  const ids = [
    ...(rawData.validatedItems ?? []).map((item) =>
      item.target && item.target !== 'self' ? item.target : null
    ),
    ...(rawData.activityMonthlyPaymentLines ?? []).map((line) => line.childId),
    ...(rawData.socialFeeParticipants ?? []).map(
      (participant) => participant.childId
    ),
  ];

  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

export function buildPaymentDetailLines({
  orderItems,
  rawData,
  selfName,
  childNameById,
}: {
  orderItems: PaymentDetailOrderItem[];
  rawData: ManualPaymentRawData;
  selfName: string;
  childNameById: Map<string, string>;
}) {
  const validatedItems = rawData.validatedItems ?? [];
  const activitySources = [
    ...validatedItems.map((item) => ({
      target: item.target,
      targetLabel: item.targetLabel,
    })),
    ...(rawData.activityMonthlyPaymentLines ?? []).map((line) => ({
      target: line.childId ?? 'self',
      targetLabel: line.targetLabel,
    })),
  ];
  const activityItems = orderItems.filter(
    (item) => item.billableConcept.code === 'ACTIVITY_FEE'
  );
  const firstSocialFeeItem = orderItems.find(
    (item) => item.billableConcept.code === 'SOCIAL_FEE'
  );

  const activityLines = activityItems.map((item, index) => {
    const source = activitySources[index];
    const childId =
      source?.target && source.target !== 'self' ? source.target : null;
    const participantName = childId
      ? (childNameById.get(childId) ?? source?.targetLabel ?? 'Menor')
      : (source?.targetLabel ?? selfName);

    return {
      id: `activity-${index}`,
      concept: 'Actividad',
      description: item.activity?.name ?? item.description,
      participantName,
      amount: item.total,
      periodLabel: formatPeriod(item.periodMonth, item.periodYear),
    };
  });

  const socialFeeLines = buildSocialFeeLines({
    item: firstSocialFeeItem,
    rawData,
    selfName,
    childNameById,
  });

  const otherLines = orderItems.flatMap((item, index) => {
    switch (item.billableConcept.code) {
      case 'ACTIVITY_FEE':
      case 'SOCIAL_FEE':
        return [];
      case 'DISCOUNT':
        return [
          buildOtherLine({
            item,
            index,
            idPrefix: 'discount',
            concept: 'Descuento',
            participantName: 'Grupo familiar',
          }),
        ];
      case 'SURCHARGE':
        return [
          buildOtherLine({
            item,
            index,
            idPrefix: 'surcharge',
            concept: 'Recargo',
            participantName: selfName,
          }),
        ];
      default:
        return [
          buildOtherLine({
            item,
            index,
            idPrefix: item.billableConcept.code.toLowerCase(),
            concept: item.billableConcept.code.toLowerCase().replace(/_/g, ' '),
            participantName: selfName,
          }),
        ];
    }
  });

  return [...activityLines, ...socialFeeLines, ...otherLines];
}

function buildSocialFeeLines({
  item,
  rawData,
  selfName,
  childNameById,
}: {
  item: PaymentDetailOrderItem | undefined;
  rawData: ManualPaymentRawData;
  selfName: string;
  childNameById: Map<string, string>;
}) {
  if (!item) return [];

  const participants = rawData.socialFeeParticipants ?? [];
  const amount = rawData.socialFeeAmount ?? item.unitPrice;
  const periodLabel = formatPeriod(item.periodMonth, item.periodYear);

  if (participants.length === 0) {
    return [
      {
        id: 'social-fee',
        concept: 'Cuota social',
        description: item.description || 'Cuota social',
        participantName:
          item.quantity > 1 ? `${item.quantity} participantes` : selfName,
        amount: item.total,
        periodLabel,
      },
    ];
  }

  return participants.map((participant) => ({
    id: `social-fee-${participant.userId}-${participant.childId ?? 'self'}`,
    concept: 'Cuota social',
    description: 'Cuota social',
    participantName: participant.childId
      ? (childNameById.get(participant.childId) ?? 'Menor')
      : selfName,
    amount,
    periodLabel,
  }));
}

function buildOtherLine({
  item,
  index,
  idPrefix,
  concept,
  participantName,
}: {
  item: PaymentDetailOrderItem;
  index: number;
  idPrefix: string;
  concept: string;
  participantName: string;
}) {
  return {
    id: `${idPrefix}-${index}`,
    concept,
    description: item.description,
    participantName,
    amount: item.total,
    periodLabel: formatPeriod(item.periodMonth, item.periodYear),
  };
}

function formatPeriod(month: number, year: number) {
  const monthName = MONTHS[month - 1];
  return monthName ? `${monthName} ${year}` : `${month}/${year}`;
}
