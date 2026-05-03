'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SWITCHABLE_PROFILES } from '@/lib/roles';
import type { Role } from '@prisma/client';

const PROFILE_LABELS: Record<Role, string> = {
  MEMBER: 'Socio / padre',
  PROFESSOR: 'Profesor',
  COUNTER: 'Contaduría',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Administrador',
};

export default function ProfileSwitcher({ className }: { className?: string }) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const roles = (session?.user?.roles ?? []) as Role[];
  const activeRole = (session?.user?.activeRole ?? 'MEMBER') as Role;

  // Show only profiles the user can switch into. MEMBER is always implicit.
  const choices = SWITCHABLE_PROFILES.filter(
    (r) => r === 'MEMBER' || roles.includes(r)
  );

  if (choices.length <= 1) return null;

  async function switchTo(role: Role) {
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const res = await fetch('/api/profile/active-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
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
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium hover:bg-muted hover:text-primary transition-colors',
          pending && 'opacity-60 cursor-wait'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Cambiar perfil de uso"
      >
        <span className="opacity-80">Perfil:</span>
        <span>{PROFILE_LABELS[activeRole] ?? activeRole}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 min-w-48 overflow-hidden rounded-md border bg-card text-black shadow-lg"
        >
          {choices.map((role) => {
            const isActive = role === activeRole;
            return (
              <li key={role}>
                <button
                  type="button"
                  onClick={() => switchTo(role)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-muted hover:text-primary transition-colors',
                    isActive && 'bg-muted/60 font-semibold'
                  )}
                >
                  <span>{PROFILE_LABELS[role]}</span>
                  {isActive && <Check className="h-4 w-4 opacity-70" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p className="absolute right-0 top-full mt-1 text-xs text-red-500">
          No se pudo cambiar de perfil
        </p>
      )}
    </div>
  );
}
