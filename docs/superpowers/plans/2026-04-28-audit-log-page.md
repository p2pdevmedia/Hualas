# Audit Log Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/admin/audit-log` page visible and accessible only to `SUPER_ADMIN`, with a navbar link and a paginated table showing `DbAuditLog` records.

**Architecture:** API route enforces `SUPER_ADMIN` guard and returns paginated logs. Server page component re-enforces the guard and renders a client table component with filters and expandable before/after JSON. Navbar gets a new link inside the existing `isSuperAdmin` block.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma, NextAuth, next-auth `getServerSession`.

---

### Task 1: Add `auditLog` translation key to all 4 languages in i18n

**Files:**

- Modify: `src/lib/i18n.ts:14` (es nav block), `:51` (pt nav block), `:88` (en nav block), `:125` (fr nav block)

- [ ] **Step 1: Add key to Spanish nav block (line ~14)**

In `src/lib/i18n.ts`, inside the `es.nav` object, after `admin: 'Administrador del sitio',` add:

```ts
      auditLog: 'Registro de auditoría',
```

- [ ] **Step 2: Add key to Portuguese nav block (line ~51)**

Inside `pt.nav`, after `admin: 'Administrador do Site',` add:

```ts
      auditLog: 'Registro de auditoria',
```

- [ ] **Step 3: Add key to English nav block (line ~88)**

Inside `en.nav`, after `admin: 'Site Administrator',` add:

```ts
      auditLog: 'Audit Log',
```

- [ ] **Step 4: Add key to French nav block (line ~125)**

Inside `fr.nav`, after `admin: 'Administrateur du Site',` add:

```ts
      auditLog: 'Journal d\'audit',
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no type errors related to i18n.

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(i18n): add auditLog nav translation key"
```

---

### Task 2: Add Audit Log link to navbar (desktop + mobile)

**Files:**

- Modify: `src/components/navbar.tsx:168-178` (desktop isSuperAdmin block), `src/components/navbar.tsx:308-325` (mobile isSuperAdmin block)

- [ ] **Step 1: Add link in desktop isSuperAdmin block**

In `src/components/navbar.tsx`, inside the desktop `{isSuperAdmin && (...)}` block (around line 168), add the audit log link **after** the notifications link and **before** the admin/site link:

```tsx
{
  isSuperAdmin && (
    <>
      <Link href="/admin/notifications" className={linkClass}>
        {t.notifications}
      </Link>
      <Link href="/admin/audit-log" className={linkClass}>
        {t.auditLog}
      </Link>
      <Link href="/admin/site" className={linkClass}>
        {t.admin}
      </Link>
    </>
  );
}
```

- [ ] **Step 2: Add link in mobile isSuperAdmin block**

In `src/components/navbar.tsx`, inside the mobile `{isSuperAdmin && (...)}` block (around line 308), add the audit log link in the same position:

```tsx
{
  isSuperAdmin && (
    <>
      <Link
        href="/admin/notifications"
        className={linkClass}
        onClick={() => setMenuOpen(false)}
      >
        {t.notifications}
      </Link>
      <Link
        href="/admin/audit-log"
        className={linkClass}
        onClick={() => setMenuOpen(false)}
      >
        {t.auditLog}
      </Link>
      <Link
        href="/admin/site"
        className={linkClass}
        onClick={() => setMenuOpen(false)}
      >
        {t.admin}
      </Link>
    </>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | grep -E "error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/navbar.tsx
git commit -m "feat(navbar): add Audit Log link for SUPER_ADMIN"
```

---

### Task 3: Create API route `GET /api/admin/audit-log`

**Files:**

- Create: `src/app/api/admin/audit-log/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/admin/audit-log/route.ts` with this content:

```ts
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const model = searchParams.get('model') ?? undefined;
  const action = searchParams.get('action') ?? undefined;

  const where = {
    ...(model ? { model } : {}),
    ...(action ? { action } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.dbAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.dbAuditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, pageSize: PAGE_SIZE });
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/audit-log/route.ts
git commit -m "feat(api): add GET /api/admin/audit-log for SUPER_ADMIN"
```

---

### Task 4: Create the Audit Log client table component

**Files:**

- Create: `src/app/admin/audit-log/audit-log-table.tsx`

- [ ] **Step 1: Create the client component**

Create `src/app/admin/audit-log/audit-log-table.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  model: string;
  action: string;
  recordId: string | null;
  userId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

interface ApiResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AuditLogTable() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const [model, setModel] = useState('');
  const [action, setAction] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (model) params.set('model', model);
    if (action) params.set('action', action);

    fetch(`/api/admin/audit-log?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, model, action]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  function handleFilterChange() {
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filtrar por modelo"
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            handleFilterChange();
          }}
          className="rounded-md border px-3 py-1.5 text-sm"
        />
        <input
          type="text"
          placeholder="Filtrar por acción"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            handleFilterChange();
          }}
          className="rounded-md border px-3 py-1.5 text-sm"
        />
      </div>

      {/* Table */}
      {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {!loading && data && data.logs.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay registros.</p>
      )}
      {!loading && data && data.logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Modelo</th>
                <th className="px-4 py-2">Acción</th>
                <th className="px-4 py-2">RecordId</th>
                <th className="px-4 py-2">UserId</th>
                <th className="px-4 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="border-t hover:bg-muted/50 cursor-pointer"
                    onClick={() =>
                      setExpanded(expanded === log.id ? null : log.id)
                    }
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-2 font-mono">{log.model}</td>
                    <td className="px-4 py-2 font-mono">{log.action}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {log.recordId ?? '—'}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {log.userId ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-blue-600 underline">
                      {expanded === log.id ? 'Cerrar' : 'Ver'}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-muted/30">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-muted-foreground">
                              Antes
                            </p>
                            <pre className="overflow-x-auto text-xs bg-muted p-2 rounded-md max-h-60">
                              {log.before != null
                                ? JSON.stringify(log.before, null, 2)
                                : '—'}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-muted-foreground">
                              Después
                            </p>
                            <pre className="overflow-x-auto text-xs bg-muted p-2 rounded-md max-h-60">
                              {log.after != null
                                ? JSON.stringify(log.after, null, 2)
                                : '—'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-muted-foreground">
            Página {page} de {totalPages} ({data.total} registros)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border px-3 py-1.5 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/audit-log/audit-log-table.tsx
git commit -m "feat(audit-log): add client table component"
```

---

### Task 5: Create the Audit Log page (server component)

**Files:**

- Create: `src/app/admin/audit-log/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/admin/audit-log/page.tsx`:

```tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AuditLogTable from './audit-log-table';

export default async function AuditLogPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">
        Registro de auditoría
      </h1>
      <p className="text-sm text-muted-foreground">
        Historial de cambios en la base de datos. Solo visible para Super Admin.
      </p>
      <AuditLogTable />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error" | head -20
```

Expected: no errors, new route `/admin/audit-log` appears in build output.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/audit-log/page.tsx
git commit -m "feat(audit-log): add /admin/audit-log page for SUPER_ADMIN"
```

---

### Task 6: Full build + manual smoke test checklist

- [ ] **Step 1: Final build**

```bash
pnpm build
```

Expected: exits with code 0, no errors.

- [ ] **Step 2: Start dev server and verify**

```bash
pnpm dev
```

Manual checks:

1. Log in as `SUPER_ADMIN` → navbar shows "Registro de auditoría" link (desktop and mobile).
2. Navigate to `/admin/audit-log` → page loads with table.
3. Perform any write operation (e.g., edit a user) → new row appears in audit log with correct `userId`.
4. Click "Ver" on a row → before/after JSON expands inline.
5. Test filters: type a model name (e.g., `User`) → table filters correctly.
6. Test pagination: if more than 25 records exist, "Siguiente" button appears and works.
7. Log in as `ADMIN` (not super) → navbar does NOT show the audit log link.
8. Visit `/admin/audit-log` directly as `ADMIN` → redirected to `/`.
9. Visit `/api/admin/audit-log` directly as `ADMIN` → returns 403.

- [ ] **Step 3: Commit if any last fixes were needed**

```bash
git add -p
git commit -m "fix(audit-log): smoke test fixes"
```
