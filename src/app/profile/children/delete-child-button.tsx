'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteChildButton({
  childId,
  childName,
}: {
  childId: string;
  childName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/children/${childId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'No se pudo eliminar');
        setConfirming(false);
        return;
      }
      router.refresh();
    } catch {
      setError('No se pudo eliminar');
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="space-y-2 pt-2">
        <p className="text-xs text-muted-foreground">
          ¿Eliminar a <span className="font-medium text-foreground">{childName}</span>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 inline-flex h-8 items-center justify-center rounded-full bg-destructive px-3 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(''); }}
            disabled={loading}
            className="flex-1 inline-flex h-8 items-center justify-center rounded-full border border-border px-3 text-xs font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-1">
      <button
        onClick={() => setConfirming(true)}
        className="w-full inline-flex h-8 items-center justify-center rounded-full border border-destructive px-3 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
      >
        Eliminar
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
