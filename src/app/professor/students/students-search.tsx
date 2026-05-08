'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { History, MessageCircle, X } from 'lucide-react';
import { Select } from '@/components/ui/select';

type Tutor = {
  name: string;
  phone: string | null;
  email: string;
  relationship: string;
};

type StudentHistoryEntry = {
  participantId: string;
  activityName: string;
  groupName: string;
  registeredAt: string;
  attendances: {
    date: string;
    schedule: string;
    status: 'PENDING' | 'GOING' | 'NOT_GOING';
    confirmedAt: string | null;
    cancelled: boolean;
    groupName: string | null;
    planificacion: string | null;
    devolucion: string | null;
  }[];
  reports: {
    id: string;
    type: 'participant' | 'day';
    date: string;
    schedule: string;
    cancelled: boolean;
    groupName: string | null;
    body: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    author: string | null;
    planificacion: string | null;
    devolucion: string | null;
  }[];
};

export type ProfessorGroupEntry = {
  id: string;
  name: string;
  activityName: string;
  description: string | null;
  capacity: number | null;
  minAge: number | null;
  maxAge: number | null;
  professors: {
    userId: string;
    name: string;
    email: string;
    phone: string | null;
    sessionCount: number;
  }[];
  schedules: {
    id: string;
    date: string;
    weekday?: number;
    schedule: string;
    cancelled: boolean;
    repeatsWeekly: boolean;
  }[];
  notes: {
    id: string;
    date: string;
    schedule: string;
    cancelled: boolean;
    planificacion: string | null;
    observacion: string | null;
  }[];
  participants: {
    id: string;
    type: 'child' | 'adult';
    name: string;
    age: number | null;
    responsibleName: string | null;
    attendanceSummary: {
      attended: number;
      missed: number;
    };
  }[];
};

function getParticipantAgeLabel(age: number | null) {
  if (age === null) return 'Edad no cargada';
  return `${age} año${age === 1 ? '' : 's'}`;
}

const weeklyScheduleLabels = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

function formatScheduleDay({
  date,
  weekday,
  repeatsWeekly,
}: {
  date: string;
  weekday?: number;
  repeatsWeekly: boolean;
}) {
  if (repeatsWeekly && weekday !== undefined) {
    return weeklyScheduleLabels[weekday] ?? 'Día semanal';
  }

  return new Date(date).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function getAgeSummary(participants: ProfessorGroupEntry['participants']) {
  const ages = participants
    .map((participant) => participant.age)
    .filter((age): age is number => age !== null);

  if (participants.length === 0) return 'Sin participantes';
  if (ages.length === 0) return 'Edades no cargadas';

  const min = Math.min(...ages);
  const max = Math.max(...ages);
  if (min === max) return getParticipantAgeLabel(min);

  return `${min} a ${max} años`;
}

export type StudentEntry =
  | {
      type: 'child';
      childId: string;
      name: string;
      lastName: string | null;
      birthDate: string | null;
      documentNumber: string | null;
      parentId: string;
      parentName: string;
      parentPhone: string | null;
      parentEmail: string;
      parentDni: string | null;
      tutors: Tutor[];
      activities: string[];
      history: StudentHistoryEntry[];
    }
  | {
      type: 'adult';
      userId: string;
      name: string;
      lastName: string | null;
      phone: string | null;
      email: string;
      dni: string | null;
      tutors: Tutor[];
      activities: string[];
      history: StudentHistoryEntry[];
    };

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matches(student: StudentEntry, query: string): boolean {
  const q = normalize(query);
  const fullName = normalize(`${student.name} ${student.lastName ?? ''}`);
  if (fullName.includes(q)) return true;

  if (student.type === 'child') {
    if (student.documentNumber && normalize(student.documentNumber).includes(q))
      return true;
    if (normalize(student.parentName).includes(q)) return true;
    if (normalize(student.parentEmail).includes(q)) return true;
    if (student.parentDni && normalize(student.parentDni).includes(q))
      return true;
    for (const t of student.tutors) {
      if (normalize(t.name).includes(q)) return true;
      if (normalize(t.email).includes(q)) return true;
      if (t.phone && normalize(t.phone).includes(q)) return true;
    }
  } else {
    if (student.dni && normalize(student.dni).includes(q)) return true;
    if (normalize(student.email).includes(q)) return true;
    for (const t of student.tutors) {
      if (normalize(t.name).includes(q)) return true;
      if (normalize(t.email).includes(q)) return true;
      if (t.phone && normalize(t.phone).includes(q)) return true;
    }
  }

  return false;
}

function getStudentKey(student: StudentEntry) {
  return student.type === 'child' ? student.childId : student.userId;
}

function getStudentFullName(student: StudentEntry) {
  return `${student.name} ${student.lastName ?? ''}`.trim() || 'Sin nombre';
}

function getResponsibleUserId(student: StudentEntry) {
  return student.type === 'child' ? student.parentId : student.userId;
}

function getContactPhone(student: StudentEntry) {
  return student.type === 'child' ? student.parentPhone : student.phone;
}

function getWhatsAppHref(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function formatHistoryDate(date: string) {
  return new Date(date).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatSessionDate(date: string) {
  return new Date(date).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function WhatsAppLineIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.2 18.8 6.1 15A7.6 7.6 0 1 1 9 17.9l-3.8.9Z" />
      <path d="M9.2 8.7c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.6 1.4c.1.2.1.4-.1.6l-.4.5c.5.9 1.2 1.6 2.2 2.1l.5-.5c.2-.2.4-.2.6-.1l1.4.7c.3.1.4.3.4.6v.4c0 .3-.1.5-.4.7-.4.3-1 .5-1.7.4-2.9-.4-5.1-2.6-5.5-5.4-.1-.6.1-1.2.4-1.6Z" />
    </svg>
  );
}

const attendanceLabels: Record<
  StudentHistoryEntry['attendances'][number]['status'],
  string
> = {
  GOING: 'Asistió',
  NOT_GOING: 'No asistió',
  PENDING: 'Sin confirmar',
};

const attendanceClasses: Record<
  StudentHistoryEntry['attendances'][number]['status'],
  string
> = {
  GOING: 'border-green-500/30 bg-green-500/10 text-green-700',
  NOT_GOING: 'border-destructive/30 bg-destructive/10 text-destructive',
  PENDING: 'border-border bg-muted text-muted-foreground',
};

export default function StudentsSearch({
  students,
  groups,
}: {
  students: StudentEntry[];
  groups: ProfessorGroupEntry[];
}) {
  const [activeTab, setActiveTab] = useState<'students' | 'groups'>('groups');
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const [professorsExpanded, setProfessorsExpanded] = useState(false);
  const [schedulesExpanded, setSchedulesExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<StudentEntry | null>(
    null
  );
  const [historyTab, setHistoryTab] = useState<'attendances' | 'reports'>(
    'attendances'
  );

  const visible = useMemo(() => {
    const q = query.trim();
    if (!q) return students;
    return students.filter((s) => matches(s, q));
  }, [students, query]);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null;

  useEffect(() => {
    setParticipantsExpanded(false);
    setProfessorsExpanded(false);
    setSchedulesExpanded(false);
    setNotesExpanded(false);
  }, [selectedGroupId]);

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2 rounded-xl border bg-card p-1"
        role="tablist"
        aria-label="Vista de alumnos y grupos"
      >
        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'groups'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          role="tab"
          aria-selected={activeTab === 'groups'}
        >
          Mis grupos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'students'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          role="tab"
          aria-selected={activeTab === 'students'}
        >
          Mis alumnos
        </button>
      </div>

      {activeTab === 'students' ? (
        <>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="search"
              placeholder="Buscar por nombre, apellido, DNI o email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {students.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <p>
                Todavía no hay alumnos asignados a grupos en tus actividades.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              Sin resultados para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {visible.length} de {students.length} alumno
                {students.length === 1 ? '' : 's'}
              </p>
              <ul className="space-y-3">
                {visible.map((student) => {
                  const fullName = getStudentFullName(student);
                  const href =
                    student.type === 'child'
                      ? `/professor/students/child/${student.childId}`
                      : `/professor/students/parent/${student.userId}`;
                  const responsibleUserId = getResponsibleUserId(student);
                  const whatsappHref = getWhatsAppHref(
                    getContactPhone(student)
                  );

                  return (
                    <li key={getStudentKey(student)}>
                      <div className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <Link
                            href={href}
                            className="min-w-0 flex-1 space-y-1"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{fullName}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                                  student.type === 'child'
                                    ? 'bg-sky-100 text-sky-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {student.type === 'child' ? 'Alumno' : 'Adulto'}
                              </span>
                            </div>

                            {student.type === 'child' && (
                              <div className="space-y-0.5">
                                <p className="text-sm text-muted-foreground">
                                  <span className="text-xs uppercase tracking-wide mr-1">
                                    Responsable:
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {student.parentName}
                                  </span>
                                  {student.parentPhone && (
                                    <span> · {student.parentPhone}</span>
                                  )}
                                </p>
                                {student.tutors.map((t, i) => {
                                  const relLabel: Record<string, string> = {
                                    PARENT: 'Madre/Padre',
                                    RESPONSIBLE: 'Responsable',
                                    OTHER: 'Tutor/a',
                                  };
                                  return (
                                    <p
                                      key={i}
                                      className="text-sm text-muted-foreground"
                                    >
                                      <span className="text-xs uppercase tracking-wide mr-1">
                                        {relLabel[t.relationship] ??
                                          t.relationship}
                                        :
                                      </span>
                                      <span className="font-medium text-foreground">
                                        {t.name}
                                      </span>
                                      {t.phone && <span> · {t.phone}</span>}
                                    </p>
                                  );
                                })}
                              </div>
                            )}

                            {student.type === 'adult' && (
                              <div className="space-y-0.5">
                                {student.phone && (
                                  <p className="text-sm text-muted-foreground">
                                    {student.phone}
                                  </p>
                                )}
                                {student.tutors.map((t, i) => {
                                  const relLabel: Record<string, string> = {
                                    PARENT: 'Madre/Padre',
                                    RESPONSIBLE: 'Responsable',
                                    OTHER: 'Tutor/a',
                                  };
                                  return (
                                    <p
                                      key={i}
                                      className="text-sm text-muted-foreground"
                                    >
                                      <span className="text-xs uppercase tracking-wide mr-1">
                                        {relLabel[t.relationship] ??
                                          t.relationship}
                                        :
                                      </span>
                                      <span className="font-medium text-foreground">
                                        {t.name}
                                      </span>
                                      {t.phone && <span> · {t.phone}</span>}
                                    </p>
                                  );
                                })}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-1 mt-1">
                              {student.activities.map((act) => (
                                <span
                                  key={act}
                                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                  {act}
                                </span>
                              ))}
                            </div>
                          </Link>

                          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                            {student.type === 'child' && student.birthDate && (
                              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                {new Date(student.birthDate).toLocaleDateString(
                                  'es-AR'
                                )}
                              </span>
                            )}
                            {whatsappHref ? (
                              <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Contactar por WhatsApp a ${fullName}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 text-emerald-700 transition-colors hover:bg-emerald-500/10"
                              >
                                <WhatsAppLineIcon className="h-4 w-4" />
                              </a>
                            ) : (
                              <span
                                aria-label="Sin teléfono para WhatsApp"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground opacity-40"
                              >
                                <WhatsAppLineIcon className="h-4 w-4" />
                              </span>
                            )}
                            <Link
                              href={`/chat?with=${responsibleUserId}`}
                              aria-label={`Chatear con ${
                                student.type === 'child'
                                  ? student.parentName
                                  : fullName
                              }`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-primary transition-colors hover:bg-primary/10"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setHistoryStudent(student);
                                setHistoryTab('attendances');
                              }}
                              className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <History className="h-4 w-4" />
                              Historial
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <p>Todavía no tenés grupos asignados en tus actividades.</p>
            </div>
          ) : (
            <>
              <label className="block space-y-2 rounded-xl border bg-card p-4 shadow-sm">
                <span className="text-sm font-medium text-foreground">
                  Seleccioná un grupo
                </span>
                <Select
                  value={selectedGroup?.id ?? ''}
                  onValueChange={setSelectedGroupId}
                  aria-label="Seleccionar grupo para ver su información"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.activityName} — {group.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Elegí una opción para actualizar la información del recuadro
                  de abajo.
                </p>
              </label>

              {selectedGroup && (
                <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {selectedGroup.activityName}
                      </p>
                      <h2 className="text-xl font-semibold tracking-tight">
                        {selectedGroup.name}
                      </h2>
                      {selectedGroup.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedGroup.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-3 py-1">
                        {selectedGroup.participants.length} participante
                        {selectedGroup.participants.length === 1 ? '' : 's'}
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1">
                        Edades: {getAgeSummary(selectedGroup.participants)}
                      </span>
                      {selectedGroup.capacity !== null && (
                        <span className="rounded-full bg-muted px-3 py-1">
                          Cupo: {selectedGroup.capacity}
                        </span>
                      )}
                      {(selectedGroup.minAge !== null ||
                        selectedGroup.maxAge !== null) && (
                        <span className="rounded-full bg-muted px-3 py-1">
                          Rango: {selectedGroup.minAge ?? 'sin mínimo'} -{' '}
                          {selectedGroup.maxAge ?? 'sin máximo'} años
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left"
                      onClick={() =>
                        setParticipantsExpanded((expanded) => !expanded)
                      }
                      aria-expanded={participantsExpanded}
                      aria-controls="group-participants-list"
                    >
                      <span className="font-medium">Participantes</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {selectedGroup.participants.length} participante
                        {selectedGroup.participants.length === 1 ? '' : 's'}
                        <svg
                          className={`h-4 w-4 transition-transform ${
                            participantsExpanded ? 'rotate-180' : ''
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m19.5 8.25-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </span>
                    </button>
                    <div
                      id="group-participants-list"
                      className={`${participantsExpanded ? 'block' : 'hidden'}`}
                    >
                      {selectedGroup.participants.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Este grupo todavía no tiene participantes asignados.
                        </p>
                      ) : (
                        <ul className="mt-3 divide-y rounded-lg border bg-card">
                          {selectedGroup.participants.map((participant) => (
                            <li
                              key={participant.id}
                              className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="font-medium">
                                  {participant.name}
                                </p>
                                {participant.responsibleName && (
                                  <p className="text-xs text-muted-foreground">
                                    Responsable: {participant.responsibleName}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span
                                  className="inline-flex items-center rounded-md border bg-background px-2 py-0.5 font-semibold"
                                  aria-label={`${participant.attendanceSummary.attended} sesiones asistidas y ${participant.attendanceSummary.missed} inasistencias`}
                                  title="Asistió / no vino"
                                >
                                  <span className="text-emerald-600">
                                    {participant.attendanceSummary.attended}
                                  </span>
                                  <span className="mx-1 text-muted-foreground">
                                    /
                                  </span>
                                  <span className="text-destructive">
                                    {participant.attendanceSummary.missed}
                                  </span>
                                </span>
                                <span className="rounded-full bg-muted px-2 py-0.5">
                                  {participant.type === 'child'
                                    ? 'Alumno'
                                    : 'Adulto'}
                                </span>
                                <span className="rounded-full bg-muted px-2 py-0.5">
                                  {getParticipantAgeLabel(participant.age)}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left"
                      onClick={() =>
                        setProfessorsExpanded((expanded) => !expanded)
                      }
                      aria-expanded={professorsExpanded}
                      aria-controls="group-professors-list"
                    >
                      <span className="font-medium">Profesores asignados</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {selectedGroup.professors.length} profesor
                        {selectedGroup.professors.length === 1 ? '' : 'es'}
                        <svg
                          className={`h-4 w-4 transition-transform ${
                            professorsExpanded ? 'rotate-180' : ''
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m19.5 8.25-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </span>
                    </button>
                    <div
                      id="group-professors-list"
                      className={`${professorsExpanded ? 'block' : 'hidden'}`}
                    >
                      {selectedGroup.professors.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Este grupo todavía no tiene profesores asignados en
                          sus sesiones.
                        </p>
                      ) : (
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                          {selectedGroup.professors.map((professor) => (
                            <li
                              key={professor.userId}
                              className="rounded-lg border bg-card p-3 text-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <Link
                                    href={`/professors/${professor.userId}`}
                                    prefetch={true}
                                    className="font-medium hover:text-primary hover:underline underline-offset-4"
                                  >
                                    {professor.name}
                                  </Link>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {professor.email}
                                  </p>
                                  {professor.phone && (
                                    <p className="text-xs text-muted-foreground">
                                      {professor.phone}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {professor.sessionCount} sesión
                                    {professor.sessionCount === 1 ? '' : 'es'}
                                    asignada
                                    {professor.sessionCount === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <Link
                                  href={`/chat?with=${professor.userId}`}
                                  prefetch={true}
                                  aria-label={`Iniciar chat con ${professor.name}`}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-primary transition-colors hover:bg-primary/10"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Link>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left"
                      onClick={() =>
                        setSchedulesExpanded((expanded) => !expanded)
                      }
                      aria-expanded={schedulesExpanded}
                      aria-controls="group-schedules-list"
                    >
                      <span className="font-medium">Días y horarios</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {selectedGroup.schedules.length} día
                        {selectedGroup.schedules.length === 1 ? '' : 's'}
                        <svg
                          className={`h-4 w-4 transition-transform ${
                            schedulesExpanded ? 'rotate-180' : ''
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m19.5 8.25-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </span>
                    </button>
                    <div
                      id="group-schedules-list"
                      className={`${schedulesExpanded ? 'block' : 'hidden'}`}
                    >
                      {selectedGroup.schedules.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Este grupo todavía no tiene días cargados.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {selectedGroup.schedules.map((day) => (
                            <li
                              key={day.id}
                              className="rounded-lg bg-muted/60 p-3 text-sm"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium capitalize">
                                  {formatScheduleDay(day)}
                                </span>
                                {day.cancelled && (
                                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                    Cancelado
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground">
                                {day.schedule}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left"
                      onClick={() => setNotesExpanded((expanded) => !expanded)}
                      aria-expanded={notesExpanded}
                      aria-controls="group-notes-list"
                    >
                      <span className="font-medium">
                        Planificaciones y observaciones
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {selectedGroup.notes.length} sesión
                        {selectedGroup.notes.length === 1 ? '' : 'es'}
                        <svg
                          className={`h-4 w-4 transition-transform ${
                            notesExpanded ? 'rotate-180' : ''
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m19.5 8.25-7.5 7.5-7.5-7.5"
                          />
                        </svg>
                      </span>
                    </button>
                    <div
                      id="group-notes-list"
                      className={`${notesExpanded ? 'block' : 'hidden'}`}
                    >
                      {selectedGroup.notes.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Todavía no hay planificaciones ni observaciones
                          cargadas para las sesiones de este grupo.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-3">
                          {selectedGroup.notes.map((note) => (
                            <li
                              key={note.id}
                              className="rounded-lg bg-muted/60 p-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium capitalize">
                                    {formatSessionDate(note.date)}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {note.schedule}
                                  </p>
                                </div>
                                {note.cancelled && (
                                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                    Cancelado
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 space-y-3">
                                {note.planificacion && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Planificación
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-foreground">
                                      {note.planificacion}
                                    </p>
                                  </div>
                                )}
                                {note.observacion && (
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Observación
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-foreground">
                                      {note.observacion}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {historyStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-history-title"
          onClick={() => setHistoryStudent(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-background p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary">Historial</p>
                <h2
                  id="student-history-title"
                  className="text-xl font-semibold"
                >
                  {getStudentFullName(historyStudent)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Actividades, grupos, asistencias y reportes registrados para
                  este participante.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryStudent(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cerrar historial"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div
                className="flex flex-wrap gap-2 rounded-xl border bg-muted/30 p-1"
                role="tablist"
                aria-label="Secciones del historial"
              >
                <button
                  type="button"
                  onClick={() => setHistoryTab('attendances')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    historyTab === 'attendances'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                  }`}
                  role="tab"
                  aria-selected={historyTab === 'attendances'}
                >
                  Asistencias
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('reports')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    historyTab === 'reports'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                  }`}
                  role="tab"
                  aria-selected={historyTab === 'reports'}
                >
                  Reportes
                </button>
              </div>

              {historyStudent.history.length === 0 ? (
                <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  No hay historial cargado para este participante.
                </p>
              ) : historyTab === 'attendances' ? (
                historyStudent.history.map((entry) => (
                  <section
                    key={entry.participantId}
                    className="rounded-xl border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{entry.activityName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Grupo: {entry.groupName}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        Inscripción: {formatHistoryDate(entry.registeredAt)}
                      </span>
                    </div>

                    {entry.attendances.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Sin asistencias registradas todavía.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {entry.attendances.map((attendance) => (
                          <li
                            key={`${entry.participantId}-${attendance.date}-${attendance.schedule}`}
                            className="rounded-lg bg-muted/60 p-3 text-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium capitalize">
                                {formatHistoryDate(attendance.date)}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                                  attendanceClasses[attendance.status]
                                }`}
                              >
                                {attendance.cancelled
                                  ? 'Cancelado'
                                  : attendanceLabels[attendance.status]}
                              </span>
                            </div>
                            <p className="text-muted-foreground">
                              {attendance.schedule}
                              {attendance.groupName &&
                              attendance.groupName !== entry.groupName
                                ? ` · ${attendance.groupName}`
                                : ''}
                            </p>
                            {attendance.confirmedAt && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Confirmado:{' '}
                                {formatHistoryDate(attendance.confirmedAt)}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))
              ) : historyStudent.history.every(
                  (entry) => entry.reports.length === 0
                ) ? (
                <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  No hay reportes cargados para este participante.
                </p>
              ) : (
                historyStudent.history.map((entry) => (
                  <section
                    key={`${entry.participantId}-reports`}
                    className="rounded-xl border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{entry.activityName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Grupo: {entry.groupName}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {entry.reports.length} reporte
                        {entry.reports.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {entry.reports.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Sin reportes registrados en esta actividad.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {entry.reports.map((report) => (
                          <li
                            key={`${entry.participantId}-report-${report.id}`}
                          >
                            <details className="group rounded-lg bg-muted/60 text-sm">
                              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-3">
                                <span className="font-medium capitalize">
                                  Reporte ({formatHistoryDate(report.date)})
                                </span>
                                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {report.cancelled && (
                                    <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                                      Cancelado
                                    </span>
                                  )}
                                  <span className="transition-transform group-open:rotate-180">
                                    ↓
                                  </span>
                                </span>
                              </summary>
                              <div className="border-t px-3 py-3">
                                <p className="text-muted-foreground">
                                  {report.schedule}
                                  {report.groupName &&
                                  report.groupName !== entry.groupName
                                    ? ` · ${report.groupName}`
                                    : ''}
                                </p>
                                {report.author && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Cargado por {report.author}
                                  </p>
                                )}
                                <div className="mt-3 space-y-3">
                                  {report.body && (
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Reporte
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap text-foreground">
                                        {report.body}
                                      </p>
                                    </div>
                                  )}
                                  {report.planificacion && (
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Planificación
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap text-foreground">
                                        {report.planificacion}
                                      </p>
                                    </div>
                                  )}
                                  {report.devolucion && (
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Devolución
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap text-foreground">
                                        {report.devolucion}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </details>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
