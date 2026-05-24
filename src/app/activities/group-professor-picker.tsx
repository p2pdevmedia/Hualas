'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export type GroupProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

function formatProfessorName(professor: GroupProfessorOption) {
  return (
    `${professor.name ?? ''} ${professor.lastName ?? ''}`.trim() ||
    professor.email
  );
}

export default function GroupProfessorPicker({
  professors,
  value,
  onChange,
}: {
  professors: GroupProfessorOption[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedProfessors = professors.filter((professor) =>
    value.includes(professor.id)
  );
  const selectedLabel =
    selectedProfessors.length === 0
      ? 'Sin profesores'
      : selectedProfessors.length === 1
        ? '1 profesor'
        : `${selectedProfessors.length} profesores`;

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen(true)}
      >
        <span>Profesores</span>
        <span className="text-xs font-normal text-muted-foreground">
          {selectedLabel}
        </span>
      </Button>

      {selectedProfessors.length > 0 && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {selectedProfessors.map(formatProfessorName).join(', ')}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-lg bg-background shadow-xl">
            <div className="border-b p-4">
              <h4 className="text-base font-semibold">Profesores</h4>
              <p className="text-xs text-muted-foreground">
                Selecciona uno o mas profesores para este grupo.
              </p>
            </div>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
              {professors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Primero selecciona profesores para la actividad.
                </p>
              ) : (
                professors.map((professor) => {
                  const checked = value.includes(professor.id);
                  return (
                    <label
                      key={professor.id}
                      className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          if (event.target.checked) {
                            onChange([...value, professor.id]);
                            return;
                          }
                          onChange(value.filter((id) => id !== professor.id));
                        }}
                        className="mt-1 accent-primary"
                      />
                      <span>
                        <span className="block font-medium">
                          {formatProfessorName(professor)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {professor.email}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end border-t p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
