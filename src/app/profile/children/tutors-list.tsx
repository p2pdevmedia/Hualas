'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

type Tutor = {
  id: string;
  memberId: string;
  name: string;
  email: string;
  relationship: string;
};

const relationshipLabel: Record<string, string> = {
  PARENT: 'Madre / Padre',
  RESPONSIBLE: 'Responsable',
  OTHER: 'Tutor/a',
  CHILD: 'Hijo/a',
};

export default function TutorsList({
  familyGroupId,
  tutors,
  isResponsible,
}: {
  familyGroupId: string;
  tutors: Tutor[];
  isResponsible: boolean;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleRemove(memberId: string) {
    setError('');
    setRemoving(memberId);
    setConfirmId(null);
    try {
      const res = await fetch(`/api/family-groups/${familyGroupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo eliminar.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
    } finally {
      setRemoving(null);
    }
  }

  if (tutors.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Madres, padres y tutores
      </p>
      <div className="space-y-2">
        {tutors.map((tutor) => (
          <div
            key={tutor.id}
            className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
              {tutor.name[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{tutor.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {tutor.email}
              </p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {relationshipLabel[tutor.relationship] ?? tutor.relationship}
            </span>
            {isResponsible &&
              (confirmId === tutor.memberId ? (
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRemove(tutor.memberId)}
                    disabled={removing === tutor.memberId}
                    className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                  >
                    {removing === tutor.memberId ? '...' : 'Sí, eliminar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="rounded-full border px-2 py-0.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setConfirmId(tutor.memberId);
                  }}
                  disabled={removing !== null}
                  className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                  title="Eliminar del grupo"
                >
                  <X className="h-4 w-4" />
                </button>
              ))}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
