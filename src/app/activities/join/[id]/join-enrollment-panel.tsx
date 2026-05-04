'use client';

import { useMemo, useState } from 'react';
import RegisterButton from '@/app/activities/[id]/register-button';
import GroupScheduleCalendar from './group-schedule-calendar';

type Group = { id: string; name: string };
type Session = { id: string; date: string; schedule: string; activityGroupId: string | null };

export default function JoinEnrollmentPanel({
  activity,
  groups,
  sessions,
  isFull,
  hasCapacity,
  remainingSpots,
}: {
  activity: { id: string; name: string; price: number; activityType: 'ANNUAL' | 'TEMPORARY' };
  groups: Group[];
  sessions: Session[];
  isFull: boolean;
  hasCapacity: boolean;
  remainingSpots: number | null;
}) {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const selectedGroup = useMemo(() => groups.find((group) => group.id === selectedGroupId), [groups, selectedGroupId]);

  return (
    <div className="space-y-4">
      {groups.length > 0 && (
        <GroupScheduleCalendar
          activityType={activity.activityType}
          groups={groups}
          sessions={sessions}
          selectedGroupId={selectedGroupId}
          onGroupChange={setSelectedGroupId}
        />
      )}
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-body">Inscripción</p>
          <p className="font-heading text-2xl font-semibold">${activity.price}</p>
          {hasCapacity && (
            <p className={`text-xs font-body ${isFull ? 'text-destructive' : 'text-muted-foreground'}`}>
              {isFull ? 'Cupo completo' : `${remainingSpots} lugares disponibles`}
            </p>
          )}
        </div>

        {isFull ? (
          <div className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground font-body">
            No hay cupos disponibles en este momento.
          </div>
        ) : groups.length > 0 && !selectedGroupId ? (
          <div className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground font-body">
            Seleccioná un grupo para continuar con la inscripción.
          </div>
        ) : (
          <RegisterButton
            activityId={activity.id}
            activityName={activity.name}
            activityPrice={Number(activity.price)}
            groupId={selectedGroupId || undefined}
            groupName={selectedGroup?.name}
          />
        )}
      </div>
    </div>
  );
}
