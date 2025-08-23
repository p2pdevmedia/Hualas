'use client';

import Link from 'next/link';
import ResetPasswordButton from './reset-password-button';
import DeleteUserButton from './delete-button';
import { useTranslation } from '@/components/language-provider';

interface User {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
  role: string;
}

export default function UsersList({ users }: { users: User[] }) {
  const t = useTranslation().actions;
  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <li key={u.id} className="flex items-center gap-2">
          <span className="flex-1">
            {u.name} {u.lastName} ({u.email}) - {u.role}
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
  );
}
