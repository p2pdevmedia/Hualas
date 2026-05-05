'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type ActiveUser = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

export default function AddTutorAdminForm({
  targetUserId,
  activeUsers,
}: {
  targetUserId: string;
  activeUsers: ActiveUser[];
}) {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [relationship, setRelationship] = useState<
    'PARENT' | 'RESPONSIBLE' | 'OTHER'
  >('PARENT');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return activeUsers;
    return activeUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        `${u.name ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q)
    );
  }, [search, activeUsers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Seleccioná un usuario.');
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/tutors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, relationship }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? 'No se pudo agregar el tutor.');
      setSuccess('Tutor agregado al grupo familiar.');
      setSelectedUserId('');
      setSearch('');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo agregar el tutor.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">Buscar usuario</label>
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedUserId('');
          }}
          placeholder="Nombre o email..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Usuario{' '}
          {filtered.length > 0 && (
            <span className="text-muted-foreground font-normal">
              ({filtered.length} resultado{filtered.length !== 1 ? 's' : ''})
            </span>
          )}
        </label>
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          size={Math.min(filtered.length + 1, 8)}
        >
          <option value="">— Seleccioná un usuario —</option>
          {filtered.map((u) => (
            <option key={u.id} value={u.id}>
              {[u.name, u.lastName].filter(Boolean).join(' ') || u.email} —{' '}
              {u.email}
            </option>
          ))}
        </select>
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

      <Button
        type="submit"
        disabled={saving || !selectedUserId}
        className="w-full"
      >
        {saving ? 'Agregando...' : 'Agregar tutor'}
      </Button>
    </form>
  );
}
