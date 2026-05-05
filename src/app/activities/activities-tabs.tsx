'use client';

import { useState } from 'react';
import Link from 'next/link';
import DeleteActivityButton from './delete-activity-button';

type ActivityItem = {
  id: string;
  name: string;
  activityType: 'TEMPORARY' | 'ANNUAL';
  date: string;
  endDate: string;
  price: number;
  capacity: number | null;
  participantCount: number;
};

interface ActivitiesTabsProps {
  upcomingActivities: ActivityItem[];
  pastActivities: ActivityItem[];
}

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate).toLocaleDateString('es-AR');
  const end = new Date(endDate).toLocaleDateString('es-AR');
  return start === end ? start : `${start} al ${end}`;
}

function ActivitiesList({ activities }: { activities: ActivityItem[] }) {
  return (
    <ul className="space-y-3">
      {activities.map((activity) => (
        <li
          key={activity.id}
          className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <Link
              href={`/activities/${activity.id}`}
              className="text-base font-semibold hover:text-primary transition-colors"
            >
              {activity.name}
            </Link>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{formatDateRange(activity.date, activity.endDate)}</span>
              <span>·</span>
              <span>${activity.price}</span>
              <span>·</span>
              <span>
                {activity.capacity
                  ? `${Math.max(activity.capacity - activity.participantCount, 0)} cupos restantes`
                  : `${activity.participantCount} suscriptos`}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              href={`/activities/${activity.id}`}
              className="inline-flex items-center justify-center rounded-full border-[1.5px] border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              Ver
            </Link>
            <Link
              href={`/activities/${activity.id}/edit`}
              className="inline-flex items-center justify-center rounded-full border-[1.5px] border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Editar
            </Link>
            <DeleteActivityButton
              activityId={activity.id}
              activityName={activity.name}
              hasParticipants={activity.participantCount > 0}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ActivitiesTabs({
  upcomingActivities,
  pastActivities,
}: ActivitiesTabsProps) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const visibleActivities =
    tab === 'upcoming' ? upcomingActivities : pastActivities;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border bg-muted p-1">
        <button
          type="button"
          onClick={() => setTab('upcoming')}
          className={`rounded-md px-3 py-1.5 text-sm ${tab === 'upcoming' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}
        >
          Activas ({upcomingActivities.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('past')}
          className={`rounded-md px-3 py-1.5 text-sm ${tab === 'past' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}
        >
          Antiguas ({pastActivities.length})
        </button>
      </div>

      {visibleActivities.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>
            {tab === 'upcoming'
              ? 'No hay actividades activas.'
              : 'No hay actividades antiguas.'}
          </p>
        </div>
      ) : (
        <ActivitiesList activities={visibleActivities} />
      )}
    </div>
  );
}
