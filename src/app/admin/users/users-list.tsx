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
  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, apellido, correo o DNI"
        className="mb-4 p-2 border rounded w-full"
      />
      <ul className="space-y-2">
        {filtered.map((u) => (
          <li key={u.id} className="flex items-center gap-2">
            <span className="flex-1">
              {u.name} {u.lastName} ({u.email} - {u.dni ?? 'N/A'}) - {u.role}
            </span>
            <Link
              href={`/admin/users/${u.id}/view`}
              className="text-blue-600 hover:underline"
            >
              {t.view}
            </Link>
            <Link
              href={`/admin/users/${u.id}`}
              className="text-blue-600 hover:underline"
            >
              {t.edit}
            </Link>
            <Link
              href={`/admin/users/${u.id}/child-enrollment`}
              className="text-blue-600 hover:underline"
            >
              {t.childEnrollment}
            </Link>
            <ResetPasswordButton id={u.id} />
            <DeleteUserButton id={u.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
