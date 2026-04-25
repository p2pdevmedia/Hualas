'use client';

import Link from 'next/link';
import { useState } from 'react';
import ResetPasswordButton from './reset-password-button';
import DeleteUserButton from './delete-button';
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

  const linkClass = 'text-sm text-primary hover:text-primary/80 hover:underline underline-offset-4';

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
            <span className="flex-1 text-sm">
              <span className="font-medium">{u.name} {u.lastName}</span>
              <span className="text-muted-foreground ml-2">({u.email} · {u.dni ?? 'N/A'})</span>
              <span className="ml-2 text-xs rounded-full bg-muted px-2 py-0.5 font-medium">{u.role}</span>
            </span>
            <Link href={`/admin/users/${u.id}/view`} className={linkClass}>{t.view}</Link>
            <Link href={`/admin/users/${u.id}`} className={linkClass}>{t.edit}</Link>
            <Link href={`/admin/users/${u.id}/child-enrollment`} className={linkClass}>{t.childEnrollment}</Link>
            <ResetPasswordButton id={u.id} />
            <DeleteUserButton id={u.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
