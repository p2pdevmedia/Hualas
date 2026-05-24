'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ProfessorPicker from '../../../../professor-picker';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  minAge: number | null;
  maxAge: number | null;
  professors: Array<{ userId: string }>;
};

interface GroupEditFormProps {
  activityId: string;
  group: Group;
  professors: ProfessorOption[];
}

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export default function GroupEditForm({
  activityId,
  group,
  professors,
}: GroupEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [capacity, setCapacity] = useState(String(group.capacity ?? ''));
  const [minAge, setMinAge] = useState(String(group.minAge ?? ''));
  const [maxAge, setMaxAge] = useState(String(group.maxAge ?? ''));
  const [professorIds, setProfessorIds] = useState<string[]>(
    group.professors.map((professor) => professor.userId)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (Number(capacity) < 1) {
      setError('El cupo debe ser mayor a cero');
      return;
    }
    if (Number(maxAge) < Number(minAge)) {
      setError('La edad máxima debe ser mayor o igual a la mínima');
      return;
    }

    if (professorIds.length === 0) {
      setError('Selecciona al menos un profesor para el grupo');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/activity-groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          capacity: Number(capacity),
          minAge: Number(minAge),
          maxAge: Number(maxAge),
          professorIds,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo actualizar el grupo');
      }

      router.push(`/activities/${activityId}/groups/${group.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo actualizar el grupo'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submitForm} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del grupo"
          required
        />
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción opcional"
        />
        <input
          className={inputClass}
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Cupo"
          required
        />
        <input
          className={inputClass}
          type="number"
          min={0}
          value={minAge}
          onChange={(e) => setMinAge(e.target.value)}
          placeholder="Edad mín."
          required
        />
        <input
          className={inputClass}
          type="number"
          min={0}
          value={maxAge}
          onChange={(e) => setMaxAge(e.target.value)}
          placeholder="Edad máx."
          required
        />
      </div>

      <ProfessorPicker
        professors={professors}
        value={professorIds}
        onChange={setProfessorIds}
      />

      <div className="flex items-center justify-between gap-3">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <span className="text-xs text-muted-foreground">
            Cambios visibles en la ficha del grupo y en la asignación.
          </span>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
