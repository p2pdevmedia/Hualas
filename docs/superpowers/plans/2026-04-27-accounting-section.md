# Accounting Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a COUNTER user role and a full-featured /accounting section for club financial management, accessible to COUNTER, ADMIN, and SUPER_ADMIN.

**Architecture:** Dedicated /accounting route tree with its own layout guard. Manual movements in a new AccountingMovement Prisma model. MP payment data read from existing ActivityParticipant records. Reports aggregate both sources with CSV and PDF export.

**Tech Stack:** Next.js 14 App Router · TypeScript · Prisma · PostgreSQL · Zod · Vercel Blob · Tailwind CSS · jsPDF + jspdf-autotable

---

## File Map

### New files
- `src/lib/accounting.ts` — categories const, role helpers, formatAmount
- `src/lib/validations/accounting.ts` — Zod schemas
- `src/app/accounting/layout.tsx` — access guard + sub-nav
- `src/app/accounting/page.tsx` — dashboard (server component)
- `src/app/accounting/movements/page.tsx` — movements list (server)
- `src/app/accounting/movements/movements-table.tsx` — table with filters (client)
- `src/app/accounting/movements/movement-form.tsx` — shared form (client)
- `src/app/accounting/movements/new/page.tsx` — new movement page
- `src/app/accounting/movements/[id]/edit/page.tsx` — edit movement page
- `src/app/accounting/payments/page.tsx` — MP payments read-only (server)
- `src/app/accounting/reports/page.tsx` — reports shell (server)
- `src/app/accounting/reports/reports-client.tsx` — period selector + export (client)
- `src/app/api/accounting/movements/route.ts` — GET list, POST create
- `src/app/api/accounting/movements/[id]/route.ts` — PUT update, DELETE delete
- `src/app/api/accounting/movements/[id]/receipt/route.ts` — POST upload receipt
- `src/app/api/accounting/reports/route.ts` — GET aggregated data

### Modified files
- `prisma/schema.prisma` — COUNTER role, AccountingMovement model, MovementType enum
- `src/lib/i18n.ts` — add accounting nav key to all 4 languages
- `src/components/navbar.tsx` — add Contaduría link
- `src/app/admin/users/page.tsx` — allow COUNTER, pass readOnly
- `src/app/admin/users/users-list.tsx` — add readOnly prop
- `ROUTE_MAP.md` — document new routes

---

### Task 1: Prisma schema

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Add COUNTER to Role enum**

```prisma
enum Role {
  ADMIN
  COUNTER
  MEMBER
  PROFESSOR
  SUPER_ADMIN
}
```

- [ ] **Step 2: Add MovementType enum** (after Role enum)

```prisma
enum MovementType {
  INCOME
  EXPENSE
}
```

- [ ] **Step 3: Add AccountingMovement model** (after SiteSetting model)

```prisma
model AccountingMovement {
  id            String       @id @default(cuid())
  date          DateTime
  amount        Int
  type          MovementType
  category      String
  description   String
  receiptNumber String?
  receiptImage  String?
  createdById   String
  createdBy     User         @relation(fields: [createdById], references: [id])
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}
```

- [ ] **Step 4: Add relation to User model**

Inside `model User { ... }`, add alongside the other relations:

```prisma
  accountingMovements   AccountingMovement[]
```

- [ ] **Step 5: Run migration**

```bash
pnpm prisma migrate dev --name add_counter_role_and_accounting
```

Expected: migration succeeds, `AccountingMovement` table created.

- [ ] **Step 6: Regenerate client**

```bash
pnpm prisma:generate
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add COUNTER role and AccountingMovement model"
```

---

### Task 2: Shared accounting lib

**Files:** Create `src/lib/accounting.ts`

- [ ] **Step 1: Create the file**

```ts
export const ACCOUNTING_ROLES = ['COUNTER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type AccountingRole = (typeof ACCOUNTING_ROLES)[number];

export function isAccountingRole(role: string | undefined | null): role is AccountingRole {
  return ACCOUNTING_ROLES.includes(role as AccountingRole);
}

export const MOVEMENT_CATEGORIES = [
  'Cuotas',
  'Actividades',
  'Servicios',
  'Equipamiento',
  'Subsidios',
  'Salarios',
  'Eventos',
  'Otros',
] as const;

export type MovementCategory = (typeof MOVEMENT_CATEGORIES)[number];

export function formatAmount(centavos: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm build 2>&1 | head -20
```

Expected: no errors from the new file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/accounting.ts
git commit -m "feat: add accounting shared lib"
```

---

### Task 3: Zod validation schema

**Files:** Create `src/lib/validations/accounting.ts`

- [ ] **Step 1: Create the file**

```ts
import { z } from 'zod';
import { MOVEMENT_CATEGORIES } from '@/lib/accounting';

export const movementSchema = z.object({
  date: z.string().min(1),
  amount: z.number().int().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.enum(MOVEMENT_CATEGORIES),
  description: z.string().min(1).max(500),
  receiptNumber: z.string().optional(),
});

export type MovementInput = z.infer<typeof movementSchema>;
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm build 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations/accounting.ts
git commit -m "feat: add accounting Zod validation schema"
```

---

### Task 4: API — movements GET and POST

**Files:** Create `src/app/api/accounting/movements/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import { movementSchema } from '@/lib/validations/accounting';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'INCOME' | 'EXPENSE' | null;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    where.date = dateFilter;
  }

  const movements = await prisma.accountingMovement.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { createdBy: { select: { name: true, lastName: true } } },
  });

  return NextResponse.json(movements);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = movementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const movement = await prisma.accountingMovement.create({
    data: {
      date: new Date(parsed.data.date),
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category,
      description: parsed.data.description,
      receiptNumber: parsed.data.receiptNumber,
      createdById: (session!.user as any).id,
    },
  });

  return NextResponse.json(movement, { status: 201 });
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/accounting/movements/route.ts
git commit -m "feat: add accounting movements GET and POST API routes"
```

---

### Task 5: API — movements PUT and DELETE

**Files:** Create `src/app/api/accounting/movements/[id]/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import { movementSchema } from '@/lib/validations/accounting';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = movementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const movement = await prisma.accountingMovement.update({
    where: { id: params.id },
    data: {
      date: new Date(parsed.data.date),
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category,
      description: parsed.data.description,
      receiptNumber: parsed.data.receiptNumber,
    },
  });

  return NextResponse.json(movement);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.accountingMovement.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/api/accounting/movements/[id]/route.ts
git commit -m "feat: add accounting movements PUT and DELETE API routes"
```

---

### Task 6: API — receipt upload

**Files:** Create `src/app/api/accounting/movements/[id]/receipt/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 });
  }

  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.jpg';
  const pathname = `accounting/receipts/${params.id}/${crypto.randomUUID()}${ext}`;

  const blob = await put(pathname, file, { access: 'public', contentType: file.type });

  await prisma.accountingMovement.update({
    where: { id: params.id },
    data: { receiptImage: blob.url },
  });

  return NextResponse.json({ url: blob.url });
}
```

- [ ] **Step 2: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/api/accounting/movements/[id]/receipt/route.ts
git commit -m "feat: add accounting receipt image upload API route"
```

---

### Task 7: API — reports

**Files:** Create `src/app/api/accounting/reports/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const [movements, mpPayments] = await Promise.all([
    prisma.accountingMovement.findMany({
      where: hasDateFilter ? { date: dateFilter } : undefined,
      orderBy: { date: 'desc' },
    }),
    prisma.activityParticipant.findMany({
      where: {
        receipt: { not: null },
        ...(hasDateFilter ? { receiptDate: dateFilter } : {}),
      },
      include: {
        activity: { select: { name: true, price: true } },
        user: { select: { name: true, lastName: true } },
        child: { select: { name: true, lastName: true } },
      },
    }),
  ]);

  const totalIncome = movements.filter((m) => m.type === 'INCOME').reduce((s, m) => s + m.amount, 0);
  const totalExpense = movements.filter((m) => m.type === 'EXPENSE').reduce((s, m) => s + m.amount, 0);
  const totalMp = mpPayments.reduce((s, p) => s + p.activity.price * 100, 0);

  const byCategory: Record<string, { income: number; expense: number }> = {};
  for (const m of movements) {
    if (!byCategory[m.category]) byCategory[m.category] = { income: 0, expense: 0 };
    if (m.type === 'INCOME') byCategory[m.category].income += m.amount;
    else byCategory[m.category].expense += m.amount;
  }

  return NextResponse.json({
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    totalMp,
    byCategory,
    movements,
    mpPayments: mpPayments.map((p) => ({
      id: p.id,
      receiptDate: p.receiptDate,
      receipt: p.receipt,
      activityName: p.activity.name,
      amount: p.activity.price * 100,
      participantName: p.child
        ? `${p.child.name} ${p.child.lastName ?? ''}`.trim()
        : `${p.user.name ?? ''} ${p.user.lastName ?? ''}`.trim(),
    })),
  });
}
```

- [ ] **Step 2: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/api/accounting/reports/route.ts
git commit -m "feat: add accounting reports API route with category breakdown"
```

---

### Task 8: Accounting layout guard

**Files:** Create `src/app/accounting/layout.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isAccountingRole } from '@/lib/accounting';
import Link from 'next/link';

const navLinks = [
  { href: '/accounting', label: 'Resumen' },
  { href: '/accounting/movements', label: 'Movimientos' },
  { href: '/accounting/payments', label: 'Pagos MP' },
  { href: '/accounting/reports', label: 'Reportes' },
];

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    redirect('/');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Contaduría</h1>
      <nav className="mb-8 flex gap-6 border-b pb-3">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/accounting/layout.tsx
git commit -m "feat: add accounting layout with role guard and sub-nav"
```

---

### Task 9: Dashboard page

**Files:** Create `src/app/accounting/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { prisma } from '@/lib/prisma';
import { formatAmount } from '@/lib/accounting';
import Link from 'next/link';

function SummaryCard({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

export default async function AccountingPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [monthMovements, recentMovements, recentMpPayments] = await Promise.all([
    prisma.accountingMovement.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.accountingMovement.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      include: { createdBy: { select: { name: true, lastName: true } } },
    }),
    prisma.activityParticipant.findMany({
      where: { receipt: { not: null }, receiptDate: { gte: startOfMonth, lte: endOfMonth } },
      orderBy: { receiptDate: 'desc' },
      take: 5,
      include: {
        activity: { select: { name: true, price: true } },
        user: { select: { name: true, lastName: true } },
        child: { select: { name: true } },
      },
    }),
  ]);

  const totalIncome = monthMovements.filter((m) => m.type === 'INCOME').reduce((s, m) => s + m.amount, 0);
  const totalExpense = monthMovements.filter((m) => m.type === 'EXPENSE').reduce((s, m) => s + m.amount, 0);
  const totalMp = recentMpPayments.reduce((s, p) => s + p.activity.price * 100, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Ingresos del mes" value={formatAmount(totalIncome)} colorClass="text-emerald-600" />
        <SummaryCard label="Gastos del mes" value={formatAmount(totalExpense)} colorClass="text-red-600" />
        <SummaryCard label="Balance neto" value={formatAmount(totalIncome - totalExpense)} colorClass="text-blue-600" />
        <SummaryCard label="Cobrado vía MP (mes)" value={formatAmount(totalMp)} colorClass="text-violet-600" />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Últimos movimientos manuales</h2>
          <Link href="/accounting/movements" className="text-sm text-primary hover:underline">Ver todos</Link>
        </div>
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Categoría</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Descripción</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentMovements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(m.date).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {m.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{m.category}</td>
                  <td className="px-4 py-2 max-w-[200px] truncate">{m.description}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatAmount(m.amount)}</td>
                </tr>
              ))}
              {recentMovements.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Sin movimientos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Últimos pagos vía Mercado Pago</h2>
          <Link href="/accounting/payments" className="text-sm text-primary hover:underline">Ver todos</Link>
        </div>
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Actividad</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Participante</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentMpPayments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{p.receiptDate ? new Date(p.receiptDate).toLocaleDateString('es-AR') : '—'}</td>
                  <td className="px-4 py-2">{p.activity.name}</td>
                  <td className="px-4 py-2">{p.child?.name ?? `${p.user.name ?? ''} ${p.user.lastName ?? ''}`.trim()}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatAmount(p.activity.price * 100)}</td>
                </tr>
              ))}
              {recentMpPayments.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Sin pagos MP este mes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/accounting/page.tsx
git commit -m "feat: add accounting dashboard page"
```

---

### Task 10: Movement form client component

**Files:** Create `src/app/accounting/movements/movement-form.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOVEMENT_CATEGORIES } from '@/lib/accounting';

type MovementData = {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  receiptNumber?: string | null;
  receiptImage?: string | null;
};

export default function MovementForm({ movement }: { movement?: MovementData }) {
  const router = useRouter();
  const isEdit = !!movement;

  const [date, setDate] = useState(movement?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [amountPesos, setAmountPesos] = useState(movement ? String(movement.amount / 100) : '');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(movement?.type ?? 'INCOME');
  const [category, setCategory] = useState(movement?.category ?? MOVEMENT_CATEGORIES[0]);
  const [description, setDescription] = useState(movement?.description ?? '');
  const [receiptNumber, setReceiptNumber] = useState(movement?.receiptNumber ?? '');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const amountCentavos = Math.round(parseFloat(amountPesos) * 100);
    if (!amountPesos || isNaN(amountCentavos) || amountCentavos <= 0) {
      setError('El monto debe ser un número positivo');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(
        isEdit ? `/api/accounting/movements/${movement!.id}` : '/api/accounting/movements',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: new Date(date).toISOString(),
            amount: amountCentavos,
            type,
            category,
            description,
            receiptNumber: receiptNumber || undefined,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'Error al guardar');
      }

      const saved = await res.json();

      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        await fetch(`/api/accounting/movements/${saved.id}/receipt`, {
          method: 'POST',
          body: formData,
        });
      }

      router.push('/accounting/movements');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
  const labelClass = 'block text-sm font-medium mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Fecha *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Tipo *</label>
          <select value={type} onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE')} required className={inputClass}>
            <option value="INCOME">Ingreso</option>
            <option value="EXPENSE">Egreso</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Monto (ARS) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amountPesos}
            onChange={(e) => setAmountPesos(e.target.value)}
            required
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Categoría *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} required className={inputClass}>
            {MOVEMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Descripción *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          maxLength={500}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nro. comprobante</label>
          <input type="text" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Imagen comprobante</label>
          <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
          {movement?.receiptImage && !receiptFile && (
            <a href={movement.receiptImage} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-primary hover:underline block">
              Ver comprobante actual
            </a>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear movimiento'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/accounting/movements/movement-form.tsx
git commit -m "feat: add shared MovementForm client component"
```

---

### Task 11: Movements list page

**Files:**
- Create `src/app/accounting/movements/movements-table.tsx`
- Create `src/app/accounting/movements/page.tsx`

- [ ] **Step 1: Create movements-table.tsx**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatAmount } from '@/lib/accounting';
import { FileImage } from 'lucide-react';

type Movement = {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  receiptNumber: string | null;
  receiptImage: string | null;
};

export default function MovementsTable({ initialMovements }: { initialMovements: Movement[] }) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = initialMovements.filter((m) => {
    if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
    if (fromDate && new Date(m.date) < new Date(fromDate)) return false;
    if (toDate && new Date(m.date) > new Date(toDate)) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    setDeleting(id);
    await fetch(`/api/accounting/movements/${id}`, { method: 'DELETE' });
    setDeleting(null);
    router.refresh();
  };

  const inputClass = 'rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className={inputClass}>
          <option value="ALL">Todos</option>
          <option value="INCOME">Ingresos</option>
          <option value="EXPENSE">Egresos</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Desde <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Hasta <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fecha</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Categoría</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Descripción</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Monto</th>
              <th className="px-4 py-2 text-center font-medium text-muted-foreground">Comp.</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-muted/30">
                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(m.date).toLocaleDateString('es-AR')}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {m.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                  </span>
                </td>
                <td className="px-4 py-2">{m.category}</td>
                <td className="px-4 py-2 max-w-[220px] truncate">{m.description}</td>
                <td className="px-4 py-2 text-right font-medium">{formatAmount(m.amount)}</td>
                <td className="px-4 py-2 text-center">
                  {m.receiptImage ? (
                    <a href={m.receiptImage} target="_blank" rel="noopener noreferrer" title="Ver comprobante">
                      <FileImage className="h-4 w-4 mx-auto text-primary" />
                    </a>
                  ) : '—'}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <Link href={`/accounting/movements/${m.id}/edit`} className="text-primary hover:underline text-xs mr-3">
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={deleting === m.id}
                    className="text-red-600 hover:underline text-xs disabled:opacity-50"
                  >
                    {deleting === m.id ? '...' : 'Eliminar'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sin movimientos</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create page.tsx**

```tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import MovementsTable from './movements-table';

export default async function MovementsPage() {
  const movements = await prisma.accountingMovement.findMany({
    orderBy: { date: 'desc' },
    include: { createdBy: { select: { name: true, lastName: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Movimientos manuales</h2>
        <Link
          href="/accounting/movements/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nuevo movimiento
        </Link>
      </div>
      <MovementsTable initialMovements={movements as any} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/accounting/movements/page.tsx src/app/accounting/movements/movements-table.tsx
git commit -m "feat: add accounting movements list page"
```

---

### Task 12: New and edit movement pages

**Files:**
- Create `src/app/accounting/movements/new/page.tsx`
- Create `src/app/accounting/movements/[id]/edit/page.tsx`

- [ ] **Step 1: Create new page**

```tsx
// src/app/accounting/movements/new/page.tsx
import MovementForm from '../movement-form';

export default function NewMovementPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Nuevo movimiento</h2>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <MovementForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create edit page**

```tsx
// src/app/accounting/movements/[id]/edit/page.tsx
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import MovementForm from '../../movement-form';

export default async function EditMovementPage({ params }: { params: { id: string } }) {
  const movement = await prisma.accountingMovement.findUnique({ where: { id: params.id } });
  if (!movement) notFound();

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Editar movimiento</h2>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <MovementForm
          movement={{
            id: movement.id,
            date: movement.date.toISOString(),
            amount: movement.amount,
            type: movement.type,
            category: movement.category,
            description: movement.description,
            receiptNumber: movement.receiptNumber,
            receiptImage: movement.receiptImage,
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/accounting/movements/new/page.tsx src/app/accounting/movements/[id]/edit/page.tsx
git commit -m "feat: add new and edit movement pages"
```

---

### Task 13: MP Payments page

**Files:** Create `src/app/accounting/payments/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { prisma } from '@/lib/prisma';
import { formatAmount } from '@/lib/accounting';

export default async function PaymentsPage() {
  const payments = await prisma.activityParticipant.findMany({
    where: { receipt: { not: null } },
    orderBy: { receiptDate: 'desc' },
    include: {
      activity: { select: { name: true, price: true } },
      user: { select: { name: true, lastName: true } },
      child: { select: { name: true, lastName: true } },
    },
  });

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Pagos vía Mercado Pago</h2>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fecha</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Actividad</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Participante</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Recibo</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                  {p.receiptDate ? new Date(p.receiptDate).toLocaleDateString('es-AR') : '—'}
                </td>
                <td className="px-4 py-2">{p.activity.name}</td>
                <td className="px-4 py-2">
                  {p.child
                    ? `${p.child.name} ${p.child.lastName ?? ''}`.trim()
                    : `${p.user.name ?? ''} ${p.user.lastName ?? ''}`.trim()}
                </td>
                <td className="px-4 py-2 text-muted-foreground text-xs">{p.receipt ?? '—'}</td>
                <td className="px-4 py-2 text-right font-medium">{formatAmount(p.activity.price * 100)}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Sin pagos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{payments.length} pago{payments.length !== 1 ? 's' : ''} registrado{payments.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/accounting/payments/page.tsx
git commit -m "feat: add accounting MP payments read-only page"
```

---

### Task 14: Reports page with CSV and PDF export

**Files:**
- Create `src/app/accounting/reports/reports-client.tsx`
- Create `src/app/accounting/reports/page.tsx`

- [ ] **Step 1: Install jsPDF**

```bash
pnpm add jspdf jspdf-autotable
```

Expected: packages added without errors.

- [ ] **Step 2: Create reports-client.tsx**

```tsx
'use client';

import { useState } from 'react';
import { formatAmount } from '@/lib/accounting';

type ReportData = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalMp: number;
  byCategory: Record<string, { income: number; expense: number }>;
  movements: {
    id: string;
    date: string;
    type: string;
    category: string;
    description: string;
    amount: number;
    receiptNumber: string | null;
  }[];
};

export default function ReportsClient() {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/reports?from=${from}&to=${to}`);
      if (!res.ok) throw new Error('Error al cargar el reporte');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto (ARS)', 'Comprobante'],
      ...data.movements.map((m) => [
        new Date(m.date).toLocaleDateString('es-AR'),
        m.type === 'INCOME' ? 'Ingreso' : 'Egreso',
        m.category,
        m.description,
        (m.amount / 100).toFixed(2),
        m.receiptNumber ?? '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-contaduria-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!data) return;
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Reporte de Contaduría', 14, 16);
    doc.setFontSize(10);
    doc.text(`Período: ${from} — ${to}`, 14, 23);

    autoTable(doc, {
      startY: 30,
      head: [['Concepto', 'Monto']],
      body: [
        ['Total ingresos', formatAmount(data.totalIncome)],
        ['Total egresos', formatAmount(data.totalExpense)],
        ['Balance neto', formatAmount(data.netBalance)],
        ['Cobrado vía MP', formatAmount(data.totalMp)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
    });

    const y1 = (doc as any).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: y1,
      head: [['Categoría', 'Ingresos', 'Egresos', 'Neto']],
      body: Object.entries(data.byCategory).map(([cat, v]) => [
        cat,
        formatAmount(v.income),
        formatAmount(v.expense),
        formatAmount(v.income - v.expense),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
    });

    const y2 = (doc as any).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: y2,
      head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
      body: data.movements.map((m) => [
        new Date(m.date).toLocaleDateString('es-AR'),
        m.type === 'INCOME' ? 'Ingreso' : 'Egreso',
        m.category,
        m.description.slice(0, 50),
        formatAmount(m.amount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`reporte-contaduria-${from}-${to}.pdf`);
  };

  const inputClass = 'rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="block text-xs text-muted-foreground">Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-muted-foreground">Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Generar reporte'}
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Ingresos', value: formatAmount(data.totalIncome), color: 'text-emerald-600' },
              { label: 'Egresos', value: formatAmount(data.totalExpense), color: 'text-red-600' },
              { label: 'Balance neto', value: formatAmount(data.netBalance), color: 'text-blue-600' },
              { label: 'Cobrado vía MP', value: formatAmount(data.totalMp), color: 'text-violet-600' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Categoría</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Ingresos</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Egresos</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(data.byCategory).map(([cat, v]) => (
                  <tr key={cat}>
                    <td className="px-4 py-2">{cat}</td>
                    <td className="px-4 py-2 text-right text-emerald-600">{formatAmount(v.income)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatAmount(v.expense)}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatAmount(v.income - v.expense)}</td>
                  </tr>
                ))}
                {Object.keys(data.byCategory).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Sin movimientos en el período</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={exportCsv} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Exportar CSV
            </button>
            <button onClick={exportPdf} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Exportar PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create page.tsx**

```tsx
// src/app/accounting/reports/page.tsx
import ReportsClient from './reports-client';

export default function ReportsPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">Reportes</h2>
      <ReportsClient />
    </div>
  );
}
```

- [ ] **Step 4: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/accounting/reports/page.tsx src/app/accounting/reports/reports-client.tsx
git commit -m "feat: add accounting reports page with CSV and PDF export"
```

---

### Task 15: Users list readOnly for COUNTER

**Files:**
- Modify `src/app/admin/users/users-list.tsx`
- Modify `src/app/admin/users/page.tsx`

- [ ] **Step 1: Add readOnly prop to UsersList**

In `src/app/admin/users/users-list.tsx`, change the component signature from:

```tsx
export default function UsersList({ users }: { users: User[] }) {
```

to:

```tsx
export default function UsersList({ users, readOnly = false }: { users: User[]; readOnly?: boolean }) {
```

Then wrap the edit link and the `<details>` block (lines 95–136) with `{!readOnly && (...)}`:

```tsx
            {!readOnly && (
              <Link
                href={`/admin/users/${u.id}`}
                className={`${linkClass} hidden sm:inline`}
              >
                {t.edit}
              </Link>
            )}
            {!readOnly && (
              <details className="group relative">
                <summary
                  aria-label={t.moreActions}
                  className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </summary>
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border bg-card p-1 shadow-lg">
                  <Link href={`/admin/users/${u.id}`} className={`${menuItemClass} sm:hidden`}>
                    {t.edit}
                  </Link>
                  <Link href={`/admin/users/${u.id}/child-enrollment`} className={menuItemClass}>
                    {t.childEnrollment}
                  </Link>
                  <button type="button" onClick={() => resetPassword(u.id)} className={menuItemClass}>
                    {t.resetPassword}
                  </button>
                  <button type="button" onClick={() => deleteUser(u.id)} className={`${menuItemClass} text-red-600 hover:bg-red-50`}>
                    {t.delete}
                  </button>
                </div>
              </details>
            )}
```

- [ ] **Step 2: Update UsersPage to allow COUNTER**

Replace the full content of `src/app/admin/users/page.tsx` with:

```tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UsersList from './users-list';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isCounter = role === 'COUNTER';

  if (!isAdmin && !isCounter) {
    redirect('/');
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      dni: true,
      role: true,
      profilePhoto: true,
      updatedAt: true,
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <UsersList users={users} readOnly={isCounter} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build + commit**

```bash
pnpm build 2>&1 | head -20
git add src/app/admin/users/users-list.tsx src/app/admin/users/page.tsx
git commit -m "feat: allow COUNTER to view users list in read-only mode"
```

---

### Task 16: i18n + navbar

**Files:**
- Modify `src/lib/i18n.ts`
- Modify `src/components/navbar.tsx`

- [ ] **Step 1: Add accounting key to i18n.ts**

In each language's `nav` block, add `accounting`:

```ts
// es → nav:
accounting: 'Contaduría',

// pt → nav:
accounting: 'Contabilidade',

// en → nav:
accounting: 'Accounting',

// fr → nav:
accounting: 'Comptabilité',
```

- [ ] **Step 2: Update navbar.tsx**

After the `isSuperAdmin` line, add:

```ts
const isCounter = role === 'COUNTER';
const canSeeAccounting = isAdmin || isCounter;
```

In both the desktop nav section (`hidden md:flex`) and the mobile menu section, add the accounting link **before** the contact link:

```tsx
{canSeeAccounting && (
  <Link href="/accounting" className={linkClass}>
    {t.accounting}
  </Link>
)}
```

In the mobile version, also pass `onClick={() => setMenuOpen(false)}` to the Link.

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | head -20
```

- [ ] **Step 4: Manual check**

```bash
pnpm dev
```

- Log in as COUNTER → should see "Contaduría" in navbar, dashboard at `/accounting`
- Log in as MEMBER → no link, redirect to `/` if navigating to `/accounting`
- Log in as ADMIN → should see "Contaduría" alongside other admin links

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/components/navbar.tsx
git commit -m "feat: add Contaduría nav link for COUNTER and admin roles"
```

---

### Task 17: Update ROUTE_MAP.md

**Files:** Modify `ROUTE_MAP.md`

- [ ] **Step 1: Add accounting section to Frontend Routes**

Under `### Admin`, add:

```markdown
### Accounting

- `/accounting` → Accounting dashboard
  - File: `src/app/accounting/page.tsx`
  - Layout guard: `src/app/accounting/layout.tsx`

- `/accounting/movements` → Manual movements list
  - File: `src/app/accounting/movements/page.tsx`
  - Related component: `src/app/accounting/movements/movements-table.tsx`

- `/accounting/movements/new` → Create movement
  - File: `src/app/accounting/movements/new/page.tsx`
  - Related form: `src/app/accounting/movements/movement-form.tsx`

- `/accounting/movements/[id]/edit` → Edit movement
  - File: `src/app/accounting/movements/[id]/edit/page.tsx`
  - Related form: `src/app/accounting/movements/movement-form.tsx`

- `/accounting/payments` → Mercado Pago payments (read-only)
  - File: `src/app/accounting/payments/page.tsx`

- `/accounting/reports` → Reports + CSV/PDF export
  - File: `src/app/accounting/reports/page.tsx`
  - Related client: `src/app/accounting/reports/reports-client.tsx`
```

- [ ] **Step 2: Add accounting section to API Routes**

```markdown
### Accounting

- `GET /api/accounting/movements` → list movements (filters: type, from, to)
  - File: `src/app/api/accounting/movements/route.ts`

- `POST /api/accounting/movements` → create movement
  - File: `src/app/api/accounting/movements/route.ts`

- `PUT /api/accounting/movements/[id]` → update movement
  - File: `src/app/api/accounting/movements/[id]/route.ts`

- `DELETE /api/accounting/movements/[id]` → delete movement
  - File: `src/app/api/accounting/movements/[id]/route.ts`

- `POST /api/accounting/movements/[id]/receipt` → upload receipt image
  - File: `src/app/api/accounting/movements/[id]/receipt/route.ts`

- `GET /api/accounting/reports` → aggregated report data
  - File: `src/app/api/accounting/reports/route.ts`
```

- [ ] **Step 3: Commit**

```bash
git add ROUTE_MAP.md
git commit -m "docs: add accounting routes to ROUTE_MAP.md"
```

---

## Self-Review

Spec coverage:
- ✅ COUNTER role → Tasks 1, 16, 8, 15
- ✅ Manual movements CRUD + receipt upload → Tasks 4, 5, 6, 10, 11, 12
- ✅ MP payments view (read-only) → Tasks 7, 13
- ✅ Reports with category breakdown → Tasks 7, 14
- ✅ CSV + PDF export → Task 14
- ✅ Dashboard with 4 cards + recent tables → Task 9
- ✅ COUNTER read-only users list → Task 15
- ✅ Contaduría navbar link → Task 16
- ✅ Route documentation → Task 17

No placeholders. Types are consistent: `MovementData` used in `movement-form.tsx` matches what `edit/page.tsx` passes. `ReportData` defined inline in `reports-client.tsx` matches the shape returned by `/api/accounting/reports`.
