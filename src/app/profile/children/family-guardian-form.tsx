'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type FamilyChildOption = {
  id: string;
  label: string;
};

export default function FamilyGuardianForm({
  childrenOptions,
}: {
  childrenOptions: FamilyChildOption[];
}) {
  const [childId, setChildId] = useState(childrenOptions[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('TUTOR');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch(`/api/children/${childId}/guardians`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, relationship }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo agregar el adulto.');
      }
      setEmail('');
      setSuccess('Adulto vinculado correctamente.');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo agregar el adulto.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-card p-4 shadow-sm space-y-3"
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Agregar madre, padre o tutor
        </h2>
        <p className="text-sm text-muted-foreground">
          El usuario debe tener una cuenta creada en la app. Al vincularlo, verá
          este hijo/a en Familia.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr,1fr,150px,auto]">
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
          required
        >
          {childrenOptions.map((child) => (
            <option key={child.id} value={child.id}>
              {child.label}
            </option>
          ))}
        </select>
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email del usuario"
          required
        />
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
        >
          <option value="MOTHER">Madre</option>
          <option value="FATHER">Padre</option>
          <option value="TUTOR">Tutor/a</option>
        </select>
        <Button type="submit" disabled={saving || !childId}>
          {saving ? 'Agregando...' : 'Agregar'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}
    </form>
  );
}
