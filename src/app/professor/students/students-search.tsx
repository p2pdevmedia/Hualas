'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Select } from '@/components/ui/select';

type Tutor = {
  name: string;
  phone: string | null;
  email: string;
  relationship: string;
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
  participants: {
    id: string;
    type: 'child' | 'adult';
    name: string;
    age: number | null;
    responsibleName: string | null;
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
                  const fullName =
                    `${student.name} ${student.lastName ?? ''}`.trim() ||
                    'Sin nombre';
                  const href =
                    student.type === 'child'
                      ? `/professor/students/child/${student.childId}`
                      : `/professor/students/parent/${student.userId}`;

                  return (
                    <li
                      key={
                        student.type === 'child'
                          ? student.childId
                          : student.userId
                      }
                    >
                      <Link
                        href={href}
                        className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
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
                        </div>

                        {student.type === 'child' && student.birthDate && (
                          <span className="shrink-0 text-xs text-muted-foreground mt-1">
                            {new Date(student.birthDate).toLocaleDateString(
                              'es-AR'
                            )}
                          </span>
                        )}
                      </Link>
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
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
                    <h3 className="font-medium">Días y horarios</h3>
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
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
