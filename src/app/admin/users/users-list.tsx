'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/components/language-provider';

interface User {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
  dni: string | null;
  role: string;
}

export default function UsersList({ users }: { users: User[] }) {
  const t = useTranslation().actions;
  const router = useRouter();
  const [query, setQuery] = useState('');
  const filtered = users.filter((u) => {
    const q = query.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.dni?.toLowerCase().includes(q)
    );
  });

  const linkClass =
    'text-sm text-primary hover:text-primary/80 hover:underline underline-offset-4';
  const menuItemClass =
    'block w-full rounded px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors';

  async function resetPassword(id: string) {
    const res = await fetch(`/api/users/${id}/reset-password`, {
      method: 'POST',
    });

    if (res.ok) {
      const data = await res.json();
      alert(`New password: ${data.password}`);
      router.refresh();
    }
  }

  async function deleteUser(id: string) {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, apellido, correo o DNI"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <ul className="divide-y divide-border">
        {filtered.map((u) => (
          <li key={u.id} className="flex items-center gap-3 py-3 flex-wrap">
            <Link
              href={`/admin/users/${u.id}/view`}
              className="flex-1 rounded-md text-sm transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span className="font-medium">
                {u.name} {u.lastName}
              </span>
              <span className="text-muted-foreground ml-2">
                ({u.email} · {u.dni ?? 'N/A'})
              </span>
              <span className="ml-2 text-xs rounded-full bg-muted px-2 py-0.5 font-medium">
                {u.role}
              </span>
            </Link>
            <Link href={`/admin/users/${u.id}`} className={linkClass}>
              {t.edit}
            </Link>
            <details className="group relative">
              <summary
                aria-label={t.moreActions}
                className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border bg-card p-1 shadow-lg">
                <Link
                  href={`/admin/users/${u.id}/child-enrollment`}
                  className={menuItemClass}
                >
                  {t.childEnrollment}
                </Link>
                <button
                  type="button"
                  onClick={() => resetPassword(u.id)}
                  className={menuItemClass}
                >
                  {t.resetPassword}
                </button>
                <button
                  type="button"
                  onClick={() => deleteUser(u.id)}
                  className={`${menuItemClass} text-red-600 hover:bg-red-50`}
                >
                  {t.delete}
                </button>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
