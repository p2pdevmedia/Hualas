import { formatAmount } from '@/lib/accounting';
import type { ActivityListRecord } from './activity-records';

export type PublicActivityCard = {
  id: string;
  name: string;
  description: string;
  dateLabel: string;
  statusLabel: string;
  typeLabel: string;
  frequencyLabel: string;
  capacityLabel: string;
  priceLabel: string;
  participantCount: number;
  imageUrl: string | null;
  actionHref: string;
  actionLabel: string;
};

function formatDateRange(startDate: Date, endDate: Date) {
  const start = startDate.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
  });
  const end = endDate.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
  });

  return start === end ? start : `${start} al ${end}`;
}

function getActivityStatusLabel(activity: { date: Date; endDate: Date }) {
  const now = new Date();
  if (activity.endDate < now) return 'Finalizada';
  if (activity.date > now) return 'Próxima';
  return 'En curso';
}

const activityTypeLabels: Record<'TEMPORARY' | 'ANNUAL', string> = {
  TEMPORARY: 'Temporal',
  ANNUAL: 'Anual',
};

export function buildPublicActivityCards(
  activities: ActivityListRecord[],
  getActionHref: (activity: ActivityListRecord) => string,
  actionLabel: string
): PublicActivityCard[] {
  return activities.map((activity) => {
    const capacity = activity.capacity;
    const hasCapacity = capacity != null;
    const remainingSpots = hasCapacity
      ? Math.max(capacity - activity.participantCount, 0)
      : null;

    return {
      id: activity.id,
      name: activity.name,
      description:
        activity.description?.trim() ||
        'Una propuesta del Club Hualas para compartir montaña, comunidad y movimiento al aire libre.',
      dateLabel: formatDateRange(activity.date, activity.endDate),
      statusLabel: getActivityStatusLabel(activity),
      typeLabel:
        activityTypeLabels[
          activity.activityType as keyof typeof activityTypeLabels
        ],
      frequencyLabel: activity.frequency,
      capacityLabel: hasCapacity
        ? remainingSpots === 0
          ? 'Sin cupo'
          : `${remainingSpots} cupos`
        : `${activity.participantCount} inscriptos`,
      priceLabel: formatAmount(activity.price),
      participantCount: activity.participantCount,
      imageUrl: activity.image ? `/api/activities/${activity.id}/image` : null,
      actionHref: getActionHref(activity),
      actionLabel,
    };
  });
}
