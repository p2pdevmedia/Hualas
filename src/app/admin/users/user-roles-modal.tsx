'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Check } from 'lucide-react';
import type { Role } from '@prisma/client';

type ElevatedRole = Exclude<Role, 'MEMBER'>;

const ROLE_LABELS: Record<ElevatedRole, string> = {
  PROFESSOR: 'Profesor',
  COUNTER: 'Contaduría',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_OPTIONS: ElevatedRole[] = [
  'PROFESSOR',
  'COUNTER',
  'ADMIN',
  'SUPER_ADMIN',
];

type User = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
  role: string;
  roles: string[];
};

export default function UserRolesModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedRoles, setSelectedRoles] = useState<ElevatedRole[]>(() =>
    user.roles.filter((role): role is ElevatedRole =>
      ROLE_OPTIONS.includes(role as ElevatedRole)
    )
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const canManageSuperAdmin =
    session?.user?.roles?.includes('SUPER_ADMIN') ?? false;

  useEffect(() => {
    setSelectedRoles(
      user.roles.filter((role): role is ElevatedRole =>
        ROLE_OPTIONS.includes(role as ElevatedRole)
      )
    );
    setError('');
  }, [user]);

  function toggleRole(role: ElevatedRole, checked: boolean) {
    setSelectedRoles((prev) =>
      checked
        ? Array.from(new Set([...prev, role]))
        : prev.filter((r) => r !== role)
    );
  }

  function save() {
    setError('');
    startTransition(async () => {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: selectedRoles }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'No se pudieron guardar los roles');
        return;
      }

      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Administrar roles
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.name} {user.lastName} · {user.email}
          </p>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">
            MEMBER es implícito. Solo marcá las capacidades adicionales.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ROLE_OPTIONS.map((role) => {
              const checked = selectedRoles.includes(role);
              const disabled = role === 'SUPER_ADMIN' && !canManageSuperAdmin;
              return (
                <label
                  key={role}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  } ${checked ? 'border-primary/40 bg-primary/5' : 'bg-card'}`}
                >
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={checked}
                    disabled={disabled || pending}
                    onChange={(e) => toggleRole(role, e.target.checked)}
                  />
                  <span>{ROLE_LABELS[role]}</span>
                  {checked && <Check className="ml-auto h-4 w-4 opacity-70" />}
                </label>
              );
            })}
          </div>
          {!canManageSuperAdmin && (
            <p className="mt-3 text-xs text-muted-foreground">
              SUPER_ADMIN solo puede cambiarlo alguien con esa misma capacidad.
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
