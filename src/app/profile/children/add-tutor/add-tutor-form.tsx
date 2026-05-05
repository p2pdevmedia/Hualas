'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AddTutorForm({
  familyGroupId,
}: {
  familyGroupId: string;
}) {
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState<
    'PARENT' | 'RESPONSIBLE' | 'OTHER'
  >('PARENT');
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
      const res = await fetch(`/api/family-groups/${familyGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, relationship }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? 'No se pudo agregar el integrante.');
      setEmail('');
      setRelationship('PARENT');
      setSuccess('Tutor agregado al grupo familiar.');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo agregar el integrante.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@ejemplo.com"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Relación</label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={relationship}
          onChange={(e) =>
            setRelationship(
              e.target.value as 'PARENT' | 'RESPONSIBLE' | 'OTHER'
            )
          }
        >
          <option value="PARENT">Madre / Padre</option>
          <option value="RESPONSIBLE">Responsable</option>
          <option value="OTHER">Tutor/a</option>
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Agregando...' : 'Agregar tutor'}
      </Button>
    </form>
  );
}
