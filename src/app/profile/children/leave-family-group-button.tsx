'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaveFamilyGroupButton({
  familyGroupId,
  groupName,
  className,
  label = 'Salir del grupo',
  confirmLabel = 'Sí, salir',
}: {
  familyGroupId: string;
  groupName: string;
  className?: string;
  label?: string;
  confirmLabel?: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLeave() {
    setError('');
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/family-groups/${familyGroupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveSelf: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo salir del grupo familiar.');
      }
      setIsConfirming(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo salir del grupo familiar.'
      );
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <div className={className ?? 'space-y-2'}>
      {isConfirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            ¿Salir de {groupName}?
          </span>
          <button
            type="button"
            onClick={handleLeave}
            disabled={isLeaving}
            className="inline-flex h-8 items-center justify-center rounded-full bg-destructive px-3 text-xs font-medium text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors"
          >
            {isLeaving ? 'Saliendo...' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsConfirming(false);
              setError('');
            }}
            disabled={isLeaving}
            className="inline-flex h-8 items-center justify-center rounded-full border border-border px-3 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError('');
            setIsConfirming(true);
          }}
          className="inline-flex h-8 items-center justify-center rounded-full border border-destructive px-3 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          {label}
        </button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
