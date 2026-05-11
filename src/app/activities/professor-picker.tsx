'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

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
  defaultCollapsed = false,
}: ProfessorPickerProps) {
  const listId = useId();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const selectedCountLabel =
    value.length === 1 ? '1 seleccionado' : `${value.length} seleccionados`;

  const header = (
    <div>
      <h3 className="text-sm font-semibold">Profesores</h3>
      <p className="text-xs text-muted-foreground">
        Asigná uno o más profesores responsables de la actividad.
      </p>
    </div>
  );

  const professorList = (
    <div id={listId}>
      {professors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay usuarios con rol profesor disponibles.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {professors.map((professor) => {
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
                    {professor.name ?? 'Sin nombre'} {professor.lastName ?? ''}
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
  );

  if (defaultCollapsed) {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={!collapsed}
          aria-controls={listId}
          onClick={() => setCollapsed((current) => !current)}
        >
          <span>
            <span className="block text-sm font-semibold">Profesores</span>
            <span className="block text-xs text-muted-foreground">
              {selectedCountLabel}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              collapsed ? '' : 'rotate-180'
            }`}
            aria-hidden="true"
          />
        </button>
        {!collapsed && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Asigná uno o más profesores responsables de la actividad.
            </p>
            {professorList}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
      {header}
      {professorList}
    </div>
  );
}
