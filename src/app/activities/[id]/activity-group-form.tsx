'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface ActivityGroupFormProps {
  activityId: string;
}

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export default function ActivityGroupForm({
  activityId,
}: ActivityGroupFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

    setSaving(true);

    try {
      const res = await fetch(`/api/activities/${activityId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          capacity: Number(capacity),
          minAge: Number(minAge),
          maxAge: Number(maxAge),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo crear el grupo');
      }

      setName('');
      setDescription('');
      setCapacity('');
      setMinAge('');
      setMaxAge('');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo crear el grupo'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submitForm}
      className="space-y-3 rounded-lg border bg-background p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_110px_110px_110px]">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Nombre del grupo"
          required
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
          placeholder="Descripción opcional"
        />
        <input
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className={inputClass}
          placeholder="Cupo"
          required
        />
        <input
          type="number"
          min={0}
          value={minAge}
          onChange={(e) => setMinAge(e.target.value)}
          className={inputClass}
          placeholder="Edad mín."
          required
        />
        <input
          type="number"
          min={0}
          value={maxAge}
          onChange={(e) => setMaxAge(e.target.value)}
          className={inputClass}
          placeholder="Edad máx."
          required
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <span className="text-xs text-muted-foreground">
            Creá grupos para organizar los inscriptos y restringir sesiones.
          </span>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Creando...' : 'Crear grupo'}
        </Button>
      </div>
    </form>
  );
}
