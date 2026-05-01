'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import ActivityDayForm from './activity-day-form';
import AttendanceList, {
  type ParticipantForAttendance,
} from './attendance-list';

type AttendanceStatus = 'PENDING' | 'GOING' | 'NOT_GOING';

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

type PickupNotice = {
  id: string;
  description: string;
  alternatePersonName: string | null;
  child: {
    id: string;
    name: string;
    user: {
      name: string | null;
    };
  };
  createdBy: {
    name: string | null;
  };
  alternatePersonUser: {
    name: string | null;
  } | null;
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
  attendances: Array<{
    activityParticipantId: string;
    status: AttendanceStatus;
    confirmedAt: string | null;
  }>;
  attendanceList: ParticipantForAttendance[];
  pickupNotices: PickupNotice[];
};

interface ActivityDaysPanelProps {
  activityId: string;
  canManageDays: boolean;
  professors: ProfessorOption[];
  groups: GroupOption[];
  defaultProfessorIds: string[];
  registrations: Registration[];
  days: ActivityDay[];
}

const statusLabels: Record<AttendanceStatus, string> = {
  PENDING: 'Pendiente',
  GOING: 'Voy',
  NOT_GOING: 'No voy',
};

export default function ActivityDaysPanel({
  activityId,
  canManageDays,
  professors,
  groups,
  defaultProfessorIds,
  registrations,
  days,
}: ActivityDaysPanelProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [expandedLists, setExpandedLists] = useState<
    Record<string, { going: boolean; notGoing: boolean }>
  >({});

  async function updateAttendance(
    dayId: string,
    participantId: string,
    status: AttendanceStatus
  ) {
    const key = `${dayId}:${participantId}`;
    setError('');
    setSavingKey(key);
    try {
      const res = await fetch(`/api/activity-days/${dayId}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, status }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          payload?.error || 'No se pudo actualizar la asistencia'
        );
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la asistencia'
      );
    } finally {
      setSavingKey(null);
    }
  }

  function toggleExpanded(dayId: string, status: 'going' | 'notGoing') {
    setExpandedLists((prev) => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [status]: !prev[dayId]?.[status],
      },
    }));
  }

  return (
    <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold">
            Días de la actividad
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            El profesor puede programar días y los inscriptos confirman si van a
            asistir.
          </p>
        </div>
        {canManageDays && (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              Administración de días
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateForm((current) => !current)}
            >
              {showCreateForm ? 'Ocultar formulario' : 'Crear sesión'}
            </Button>
          </div>
        )}
      </div>

      {canManageDays && showCreateForm && (
        <div className="mt-5">
          <ActivityDayForm
            activityId={activityId}
            mode="create"
            professors={professors}
            groups={groups}
            defaultProfessorIds={defaultProfessorIds}
          />
        </div>
      )}

      {days.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground font-body">
          Aún no hay días cargados para esta actividad.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {days.map((day) => {
            const goingCount = day.attendances.filter(
              (attendance) => attendance.status === 'GOING'
            ).length;
            const notGoingCount = day.attendances.filter(
              (attendance) => attendance.status === 'NOT_GOING'
            ).length;
            const mapHref =
              day.latitude != null && day.longitude != null
                ? `https://www.openstreetmap.org/?mlat=${day.latitude}&mlon=${day.longitude}#map=17/${day.latitude}/${day.longitude}`
                : null;
            const professorLabels = day.assignedProfessors
              .map(
                (professor) =>
                  `${professor.name ?? 'Sin nombre'}${professor.lastName ? ` ${professor.lastName}` : ''}`
              )
              .join(', ');
            const isEditing = editingDayId === day.id;

            return (
              <article
                key={day.id}
                className="rounded-lg border bg-background p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {new Date(day.date).toLocaleDateString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {day.schedule} · {day.geoLocation}
                    </p>
                    {day.assignedProfessors.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Profesores: {professorLabels}
                      </p>
                    )}
                    {day.activityGroup && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Restringida al grupo {day.activityGroup.name}
                      </p>
                    )}
                    {mapHref && (
                      <a
                        href={mapHref}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-link hover:underline underline-offset-4"
                      >
                        Abrir en OpenStreetMap
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2 text-xs text-muted-foreground sm:items-end">
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(day.id, 'going')}
                        className="text-link hover:underline underline-offset-4 font-medium transition-colors"
                      >
                        {goingCount} confirmados{' '}
                        {expandedLists[day.id]?.going ? '▼' : '▶'}
                      </button>
                      <span>{'·'}</span>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(day.id, 'notGoing')}
                        className="text-link hover:underline underline-offset-4 font-medium transition-colors"
                      >
                        {notGoingCount} no asistirán{' '}
                        {expandedLists[day.id]?.notGoing ? '▼' : '▶'}
                      </button>
                    </div>
                    {day.canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingDayId(isEditing ? null : day.id)
                        }
                        className="text-link hover:underline underline-offset-4"
                      >
                        {isEditing ? 'Cerrar edición' : 'Editar sesión'}
                      </button>
                    )}
                  </div>
                </div>

                {day.description && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {day.description}
                  </p>
                )}

                {isEditing && (
                  <div className="mt-4">
                    <ActivityDayForm
                      key={day.id}
                      activityId={activityId}
                      mode="edit"
                      dayId={day.id}
                      professors={professors}
                      groups={groups}
                      defaultProfessorIds={defaultProfessorIds}
                      initialValues={{
                        date: day.date.slice(0, 10),
                        schedule: day.schedule,
                        description: day.description ?? '',
                        geoLocation: day.geoLocation,
                        coordinates:
                          day.latitude != null && day.longitude != null
                            ? {
                                latitude: day.latitude,
                                longitude: day.longitude,
                              }
                            : null,
                        professorIds: day.assignedProfessors.map(
                          (professor) => professor.id
                        ),
                        activityGroupId: day.activityGroupId,
                        sportIcon: day.sportIcon,
                      }}
                      onSaved={() => setEditingDayId(null)}
                      onCancel={() => setEditingDayId(null)}
                    />
                  </div>
                )}

                {(expandedLists[day.id]?.going ||
                  expandedLists[day.id]?.notGoing) && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    {expandedLists[day.id]?.going && (
                      <AttendanceList
                        label="Confirmados"
                        participants={day.attendanceList.filter(
                          (a) => a.status === 'GOING'
                        )}
                        isExpanded={true}
                      />
                    )}
                    {expandedLists[day.id]?.notGoing && (
                      <AttendanceList
                        label="No asistirán"
                        participants={day.attendanceList.filter(
                          (a) => a.status === 'NOT_GOING'
                        )}
                        isExpanded={true}
                      />
                    )}
                  </div>
                )}

                {registrations.length > 0 && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <p className="text-sm font-semibold">
                      Confirmación de asistencia
                    </p>
                    <div className="space-y-3">
                      {registrations.map((registration) => {
                        const currentAttendance = day.attendances.find(
                          (attendance) =>
                            attendance.activityParticipantId === registration.id
                        );
                        const currentStatus =
                          currentAttendance?.status ?? 'PENDING';
                        const key = `${day.id}:${registration.id}`;
                        const isSaving = savingKey === key;
                        const isAllowedForDay =
                          !day.activityGroupId ||
                          registration.groupId === day.activityGroupId;

                        return (
                          <div
                            key={registration.id}
                            className="rounded-md border bg-card p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">
                                  {registration.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Estado actual: {statusLabels[currentStatus]}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Grupo: {registration.groupName ?? 'Sin grupo'}
                                </p>
                              </div>
                              {isSaving && (
                                <span className="text-xs text-muted-foreground">
                                  Guardando...
                                </span>
                              )}
                            </div>
                            {isAllowedForDay ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {(
                                  [
                                    'GOING',
                                    'NOT_GOING',
                                    'PENDING',
                                  ] as AttendanceStatus[]
                                ).map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() =>
                                      updateAttendance(
                                        day.id,
                                        registration.id,
                                        status
                                      )
                                    }
                                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                      currentStatus === status
                                        ? 'bg-primary text-primary-foreground'
                                        : 'border border-border bg-background text-foreground hover:bg-muted'
                                    }`}
                                  >
                                    {statusLabels[status]}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-muted-foreground">
                                Este día está restringido al grupo{' '}
                                {day.activityGroup?.name ?? 'seleccionado'}.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {day.pickupNotices && day.pickupNotices.length > 0 && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <p className="text-sm font-semibold">
                      Avisos de retiro ({day.pickupNotices.length})
                    </p>
                    <div className="space-y-3">
                      {day.pickupNotices.map((notice) => (
                        <div
                          key={notice.id}
                          className="rounded-md border bg-card p-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {notice.child.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Familia: {notice.child.user.name}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">Retira:</span>{' '}
                                {notice.alternatePersonUser?.name ||
                                  notice.alternatePersonName ||
                                  'Sin especificar'}
                              </p>
                              {notice.description && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">Nota:</span>{' '}
                                  {notice.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </section>
  );
}
