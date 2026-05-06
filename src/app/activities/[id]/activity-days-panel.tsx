'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BulkSessionCreator from './bulk-session-creator';
import ActivityCalendar, {
  type CalendarActivityDay,
} from '@/app/my-activities/activity-calendar';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

type Registration = {
  id: string;
  label: string;
  groupId: string | null;
  groupName: string | null;
};

type GroupOption = {
  id: string;
  name: string;
};

type ActivityDay = {
  id: string;
  date: string;
  schedule: string;
  description: string | null;
  geoLocation: string;
  latitude: number | null;
  longitude: number | null;
  activityGroupId: string | null;
  sportIcon: string | null;
  activityGroup: {
    id: string;
    name: string;
  } | null;
  assignedProfessors: ProfessorOption[];
  canEdit: boolean;
  canEditDescription: boolean;
  attendances: Array<{
    activityParticipantId: string;
    status: string;
    confirmedAt: string | null;
  }>;
  attendanceList: unknown[];
  pickupNotices: unknown[];
};

interface ActivityDaysPanelProps {
  activityId: string;
  canManageDays: boolean;
  hideSessionDetails?: boolean;
  hideSessionList?: boolean;
  canOpenSessionDetails?: boolean;
  professors: ProfessorOption[];
  groups: GroupOption[];
  defaultProfessorIds: string[];
  registrations: Registration[];
  days: ActivityDay[];
}

export default function ActivityDaysPanel({
  activityId,
  canManageDays,
  hideSessionDetails = false,
  canOpenSessionDetails = false,
  professors,
  groups,
  defaultProfessorIds,
  days,
}: ActivityDaysPanelProps) {
  const router = useRouter();
  const [showBulkCreator, setShowBulkCreator] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const calendarDays: CalendarActivityDay[] = days.map((day) => ({
    id: day.id,
    date: day.date.slice(0, 10),
    activityId,
    activityName: 'Actividad',
    schedule: day.schedule,
    geoLocation: day.geoLocation,
    description: day.description,
    sportIcon: day.sportIcon,
    latitude: day.latitude,
    longitude: day.longitude,
    cancelled: false,
  }));

  const existingDayDates = days.map((day) => day.date.slice(0, 10));

  return (
    <>
      {showBulkCreator && (
        <BulkSessionCreator
          activityId={activityId}
          professors={professors}
          groups={groups}
          defaultProfessorIds={defaultProfessorIds}
          existingDayDates={existingDayDates}
          onClose={() => setShowBulkCreator(false)}
        />
      )}
      <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-semibold">
              Días de la actividad
            </h2>
            <p className="text-sm text-muted-foreground font-body mt-1">
              {hideSessionDetails
                ? 'Las sesiones se visualizan desde el calendario. Como administrador podés hacer click en un día para ver su detalle y editarlo.'
                : 'El profesor puede programar días y los inscriptos confirman si van a asistir.'}
            </p>
          </div>
          {canManageDays && (
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                Administración de días
              </div>
              {!hideSessionDetails && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBulkCreator(true)}
                >
                  Crear sesiones
                </Button>
              )}
            </div>
          )}
        </div>

        {days.length > 0 ? (
          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={() => setShowCalendar((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              aria-expanded={showCalendar}
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Calendario
            </button>

            {showCalendar && (
              <ActivityCalendar
                activityDays={calendarDays}
                enableSessionDetailLinks={canOpenSessionDetails}
                sessionDetailLabel="Ver sesión"
                onEdit={
                  canManageDays
                    ? (dayId) =>
                        router.push(
                          `/activities/${activityId}/days/${dayId}/edit`
                        )
                    : undefined
                }
              />
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground font-body">
            Aún no hay días cargados para esta actividad.
          </p>
        )}
      </section>
    </>
  );
}
