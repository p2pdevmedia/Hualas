'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type Tutor = {
  name: string;
  phone: string | null;
  email: string;
  relationship: string;
};

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
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
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
}: {
  students: StudentEntry[];
}) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim();
    if (!q) return students;
    return students.filter((s) => matches(s, q));
  }, [students, query]);

  return (
    <div className="space-y-4">
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
          <p>Todavía no hay alumnos asignados a grupos en tus actividades.</p>
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
                    student.type === 'child' ? student.childId : student.userId
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
                            <span className="text-xs uppercase tracking-wide mr-1">Responsable:</span>
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
                              <p key={i} className="text-sm text-muted-foreground">
                                <span className="text-xs uppercase tracking-wide mr-1">
                                  {relLabel[t.relationship] ?? t.relationship}:
                                </span>
                                <span className="font-medium text-foreground">{t.name}</span>
                                {t.phone && <span> · {t.phone}</span>}
                              </p>
                            );
                          })}
                        </div>
                      )}

                      {student.type === 'adult' && (
                        <div className="space-y-0.5">
                          {student.phone && (
                            <p className="text-sm text-muted-foreground">{student.phone}</p>
                          )}
                          {student.tutors.map((t, i) => {
                            const relLabel: Record<string, string> = {
                              PARENT: 'Madre/Padre',
                              RESPONSIBLE: 'Responsable',
                              OTHER: 'Tutor/a',
                            };
                            return (
                              <p key={i} className="text-sm text-muted-foreground">
                                <span className="text-xs uppercase tracking-wide mr-1">
                                  {relLabel[t.relationship] ?? t.relationship}:
                                </span>
                                <span className="font-medium text-foreground">{t.name}</span>
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
                        {new Date(student.birthDate).toLocaleDateString('es-AR')}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
