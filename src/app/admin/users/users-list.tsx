'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/components/language-provider';
import UserRolesModal from './user-roles-modal';

interface Child {
  id: string;
  name: string;
  lastName: string | null;
  birthDate: Date | null;
}

interface User {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
  dni: string | null;
  role: string;
  roles: string[];
  socialFeeActive: boolean;
  profilePhoto: string | null;
  updatedAt: Date;
  children: Child[];
  activities: Activity[];
}

interface Activity {
  id: string;
  name: string;
}

function calcAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@._ -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(value: string) {
  if (value.length < 2) return [value];

  const grams: string[] = [];
  for (let index = 0; index < value.length - 1; index += 1) {
    grams.push(value.slice(index, index + 2));
  }

  return grams;
}

function diceSimilarity(left: string, right: string) {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const rightGrams = bigrams(right);
  const used = new Array(rightGrams.length).fill(false);
  let matches = 0;

  for (const gram of bigrams(left)) {
    const matchIndex = rightGrams.findIndex(
      (candidate, index) => !used[index] && candidate === gram
    );

    if (matchIndex >= 0) {
      used[matchIndex] = true;
      matches += 1;
    }
  }

  return (2 * matches) / (left.length + right.length - 2);
}

function editDistanceWithin(left: string, right: string, maxDistance: number) {
  if (Math.abs(left.length - right.length) > maxDistance) return false;

  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMin = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const next = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost
      );

      current[rightIndex] = next;
      rowMin = Math.min(rowMin, next);
    }

    if (rowMin > maxDistance) return false;
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length] <= maxDistance;
}

function tokenMatches(queryToken: string, targetToken: string) {
  if (!queryToken || !targetToken) return false;
  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) {
    return true;
  }

  const maxDistance = queryToken.length >= 8 ? 2 : 1;
  if (
    queryToken.length >= 4 &&
    editDistanceWithin(queryToken, targetToken, maxDistance)
  ) {
    return true;
  }

  return (
    queryToken.length >= 4 && diceSimilarity(queryToken, targetToken) >= 0.58
  );
}

function matchesUserSearch(
  query: string,
  values: Array<string | null | undefined>
) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedValues = values
    .map((value) => normalizeSearchText(value ?? ''))
    .filter(Boolean);
  const haystack = normalizedValues.join(' ');
  if (haystack.includes(normalizedQuery)) return true;

  const targetTokens = haystack.split(' ').filter(Boolean);
  return normalizedQuery
    .split(' ')
    .filter(Boolean)
    .every((queryToken) =>
      targetTokens.some((targetToken) => tokenMatches(queryToken, targetToken))
    );
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
  const [activityId, setActivityId] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [roleEditorUser, setRoleEditorUser] = useState<User | null>(null);
  const filtered = users.filter((u) => {
    const matchesActivity =
      activityId === 'all' || u.activities.some((a) => a.id === activityId);
    if (!matchesActivity) return false;

    return matchesUserSearch(query, [
      u.name,
      u.lastName,
      u.dni,
      u.email,
      `${u.name ?? ''} ${u.lastName ?? ''}`,
      `${u.lastName ?? ''} ${u.name ?? ''}`,
    ]);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activityMap = new Map<string, Activity>();
  for (const user of users) {
    for (const activity of user.activities) {
      activityMap.set(activity.id, activity);
    }
  }
  const activityOptions = [...activityMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'es')
  );

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
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre, apellido, nombre completo o email"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={activityId}
          onChange={(e) => {
            setActivityId(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Filtrar por actividad"
        >
          <option value="all">Todas las actividades</option>
          {activityOptions.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name}
            </option>
          ))}
        </select>
      </div>
      <ul className="divide-y divide-border">
        {paginated.map((u) => (
          <li key={u.id} className="py-3 space-y-1">
            <div className="flex items-center gap-3">
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
                className="min-w-0 flex-1 rounded-md text-sm transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
                <span
                  className={`ml-2 text-xs rounded-full px-2 py-0.5 font-medium ${
                    u.socialFeeActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Cuota social {u.socialFeeActive ? 'activa' : 'inactiva'}
                </span>
              </Link>
              {!readOnly && (
                <div className="flex shrink-0 items-center gap-2">
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
                      {canManageSuperAdmin && (
                        <Link
                          href={`/admin/audit-log/user/${u.id}`}
                          className={menuItemClass}
                        >
                          Ver auditoría
                        </Link>
                      )}
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
                </div>
              )}
            </div>
            {u.children.length > 0 && (
              <div className="pl-[52px] flex flex-wrap gap-x-3 gap-y-0.5">
                {u.children.map((c) => {
                  const age = calcAge(c.birthDate);
                  return (
                    <span key={c.id} className="text-xs text-muted-foreground">
                      {c.name} {c.lastName ?? ''}
                      {age !== null ? ` · ${age} años` : ''}
                    </span>
                  );
                })}
              </div>
            )}
            {u.activities.length > 0 && (
              <div className="pl-[52px] flex flex-wrap gap-2">
                {u.activities.map((activity) => (
                  <span
                    key={activity.id}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {activity.name}
                  </span>
                ))}
              </div>
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
