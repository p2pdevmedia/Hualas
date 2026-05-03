'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/components/language-provider';
import UserRolesModal from './user-roles-modal';

interface User {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
  dni: string | null;
  role: string;
  roles: string[];
  profilePhoto: string | null;
  updatedAt: Date;
}

export default function UsersList({
  users,
  readOnly = false,
  canManageRoles = false,
  canManageSuperAdmin = false,
}: {
  users: User[];
  readOnly?: boolean;
  canManageRoles?: boolean;
  canManageSuperAdmin?: boolean;
}) {
  const t = useTranslation().actions;
  const router = useRouter();
  const PAGE_SIZE = 20;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [roleEditorUser, setRoleEditorUser] = useState<User | null>(null);
  const filtered = users.filter((u) => {
    const q = query.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.dni?.toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const linkClass =
    'text-sm text-link hover:text-link/80 hover:underline underline-offset-4';
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
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Buscar por nombre, apellido, correo o DNI"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <ul className="divide-y divide-border">
        {paginated.map((u) => (
          <li key={u.id} className="flex items-center gap-3 py-3 flex-wrap">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-muted">
              {u.profilePhoto ? (
                <Image
                  src={`/api/users/${u.id}/photo?v=${new Date(u.updatedAt).getTime()}`}
                  alt={`Foto de perfil de ${u.name ?? 'usuario'}`}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                  {(u.name?.[0] ?? '?').toUpperCase()}
                </div>
              )}
            </div>
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
            {!readOnly && (
              <>
                <Link
                  href={`/admin/users/${u.id}`}
                  className={`${linkClass} hidden sm:inline`}
                >
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
                      href={`/admin/users/${u.id}`}
                      className={`${menuItemClass} sm:hidden`}
                    >
                      {t.edit}
                    </Link>
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
                      onClick={() => setConfirmDeleteId(u.id)}
                      className={`${menuItemClass} text-red-600 hover:bg-red-50`}
                    >
                      {t.delete}
                    </button>
                    {canManageRoles &&
                      (canManageSuperAdmin ||
                        !u.roles.includes('SUPER_ADMIN')) && (
                        <button
                          type="button"
                          onClick={() => setRoleEditorUser(u)}
                          className={menuItemClass}
                        >
                          Roles
                        </button>
                      )}
                  </div>
                </details>
              </>
            )}
          </li>
        ))}
      </ul>
      {roleEditorUser && canManageRoles && (
        <UserRolesModal
          user={roleEditorUser}
          onClose={() => setRoleEditorUser(null)}
        />
      )}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold mb-2">Eliminar usuario</h2>
            <p className="text-muted-foreground mb-6">
              ¿Estás seguro de que querés eliminar este usuario? Esta acción no
              se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId('')}
                className="px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const id = confirmDeleteId;
                  setConfirmDeleteId('');
                  deleteUser(id);
                }}
                className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages} · {filtered.length} usuarios
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
