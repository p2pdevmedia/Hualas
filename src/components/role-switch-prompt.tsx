'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Lock } from 'lucide-react';
import type { Role } from '@prisma/client';

const PROFILE_LABELS: Record<Role, string> = {
  MEMBER: 'Socio / padre',
  PROFESSOR: 'Profesor',
  COUNTER: 'Contaduría',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Administrador',
};

export default function RoleSwitchPrompt({
  requiredRole,
}: {
  requiredRole: Role;
}) {
  const { update } = useSession();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function switchAndContinue() {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/profile/active-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: requiredRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'switch_failed');
        return;
      }
      await update({ updatedAt: new Date().toISOString() });
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
      <div className="rounded-full bg-amber-100 p-3 text-amber-700">
        <Lock className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Esta sección requiere otro perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          Estás navegando como tu perfil actual. Para acceder, cambiá al perfil{' '}
          <strong>{PROFILE_LABELS[requiredRole]}</strong>.
        </p>
      </div>
      <button
        type="button"
        onClick={switchAndContinue}
        disabled={pending}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
      >
        {pending
          ? 'Cambiando…'
          : `Cambiar a perfil ${PROFILE_LABELS[requiredRole]}`}
      </button>
      {error && (
        <p className="text-xs text-red-500">No se pudo cambiar de perfil.</p>
      )}
      <button
        type="button"
        onClick={() => router.back()}
        className="text-xs text-muted-foreground underline hover:text-foreground"
      >
        Volver
      </button>
    </div>
  );
}
