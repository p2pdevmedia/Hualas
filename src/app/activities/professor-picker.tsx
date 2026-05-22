'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

interface ProfessorPickerProps {
  professors: ProfessorOption[];
  value: string[];
  onChange: (nextValue: string[]) => void;
  defaultCollapsed?: boolean;
}

export default function ProfessorPicker({
  professors,
  value,
  onChange,
}: ProfessorPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredProfessors = useMemo(() => {
    if (!normalizedSearch) return professors;

    return professors.filter((professor) => {
      const fullName = `${professor.name ?? ''} ${professor.lastName ?? ''}`
        .trim()
        .toLocaleLowerCase();
      const email = professor.email.toLocaleLowerCase();
      return (
        fullName.includes(normalizedSearch) || email.includes(normalizedSearch)
      );
    });
  }, [normalizedSearch, professors]);

  const selectedProfessors = useMemo(
    () => professors.filter((professor) => value.includes(professor.id)),
    [professors, value]
  );

  const selectedCountLabel =
    value.length === 1 ? '1 seleccionado' : `${value.length} seleccionados`;

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Profesores</h3>
          <p className="text-xs text-muted-foreground">{selectedCountLabel}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Seleccionar profesores
        </Button>
      </div>

      {selectedProfessors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedProfessors.map((professor) => (
            <span
              key={professor.id}
              className="rounded-full border bg-background px-3 py-1 text-xs"
            >
              {(professor.name ?? 'Sin nombre').trim()}{' '}
              {professor.lastName ?? ''}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg bg-background shadow-xl">
            <div className="border-b p-4">
              <h4 className="text-base font-semibold">
                Seleccionar profesores
              </h4>
              <p className="text-xs text-muted-foreground">
                Elegí uno o más profesores para la actividad.
              </p>
            </div>

            <div className="space-y-3 overflow-y-auto p-4">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar profesor por nombre o email"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                aria-label="Buscar profesor"
              />

              {professors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay usuarios con rol profesor disponibles.
                </p>
              ) : filteredProfessors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No se encontraron profesores para &quot;{search.trim()}&quot;.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredProfessors.map((professor) => {
                    const checked = value.includes(professor.id);
                    return (
                      <label
                        key={professor.id}
                        className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onChange([...value, professor.id]);
                              return;
                            }
                            onChange(value.filter((id) => id !== professor.id));
                          }}
                          className="mt-1 accent-primary"
                        />
                        <span>
                          <span className="block font-medium">
                            {professor.name ?? 'Sin nombre'}{' '}
                            {professor.lastName ?? ''}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {professor.email}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setSearch('');
                }}
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
