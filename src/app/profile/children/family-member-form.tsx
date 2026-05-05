'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type FamilyMemberOption = {
  id: string;
  label: string;
};

export default function FamilyMemberForm({
  familyGroupId,
  members,
}: {
  familyGroupId: string;
  members: FamilyMemberOption[];
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
        body: JSON.stringify({
          email,
          relationship,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo agregar el integrante.');
      }
      setEmail('');
      setRelationship('PARENT');
      setSuccess('Integrante agregado al grupo familiar.');
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
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-card p-4 shadow-sm space-y-3"
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Agregar madre, padre o tutor
        </h2>
        <p className="text-sm text-muted-foreground">
          Ese usuario verá todos los hijos del grupo familiar.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr,180px,auto]">
        <input
          className="rounded-md border bg-background px-3 py-2 text-sm"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email del usuario"
          list="family-members-list"
          required
        />
        <select
          className="rounded-md border bg-background px-3 py-2 text-sm"
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
        <Button type="submit" disabled={saving}>
          {saving ? 'Agregando...' : 'Agregar'}
        </Button>
      </div>
      <datalist id="family-members-list">
        {members.map((member) => (
          <option key={member.id} value={member.label} />
        ))}
      </datalist>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}
    </form>
  );
}
