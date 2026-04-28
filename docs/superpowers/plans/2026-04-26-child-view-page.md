# Child Information View Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a read-only view page for child information in the admin panel, separate from the edit page, with expandable sections and activity enrollment list.

**Architecture:** New page at `/admin/users/[id]/children/[childId]/view` fetches child data server-side with Prisma, displays in collapsible sections using existing UI components. Admin list page updated with "Ver" button alongside existing "Editar" button.

**Tech Stack:** Next.js App Router, Prisma ORM, React (collapsible sections), existing UI button/card components

---

## File Structure

**New Files:**

- `/src/app/admin/users/[id]/children/[childId]/view/page.tsx` — View-only page component
- `/src/components/child-info-section.tsx` — Reusable collapsible section component

**Modified Files:**

- `/src/app/admin/users/[id]/view/page.tsx` — Add "Ver" button to children list

---

## Tasks

### Task 1: Create Collapsible Section Component

**Files:**

- Create: `/src/components/child-info-section.tsx`

- [ ] **Step 1: Create the collapsible section component**

Create `/src/components/child-info-section.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ChildInfoSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function ChildInfoSection({
  title,
  children,
  defaultOpen = true,
}: ChildInfoSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <h3 className="font-semibold text-sm">{title}</h3>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify component can be imported**

Run in terminal:

```bash
grep -n "export default function ChildInfoSection" src/components/child-info-section.tsx
```

Expected: Shows line number confirming export exists.

- [ ] **Step 3: Commit**

```bash
git add src/components/child-info-section.tsx
git commit -m "feat: add collapsible section component for child info"
```

---

### Task 2: Create Child View Page

**Files:**

- Create: `/src/app/admin/users/[id]/children/[childId]/view/page.tsx`

- [ ] **Step 1: Create the view page with server-side data fetch**

Create `/src/app/admin/users/[id]/children/[childId]/view/page.tsx`:

```tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChildInfoSection from '@/components/child-info-section';

export default async function ViewChildPage({
  params,
}: {
  params: { id: string; childId: string };
}) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  const child = await prisma.child.findUnique({
    where: { id: params.childId },
    include: {
      user: true,
      activityParticipants: { include: { activity: true } },
    },
  });

  if (!child || child.userId !== params.id) {
    redirect(`/admin/users/${params.id}/view`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {child.name} {child.lastName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hijo de {child.user.name} {child.user.lastName}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/users/${params.id}/children/${params.childId}/edit`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              Editar
            </Link>
            <Link
              href={`/admin/users/${params.id}/view`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted transition-colors"
            >
              ← Volver
            </Link>
          </div>
        </div>

        {/* Document info summary */}
        {(child.documentFrontPhoto || child.documentBackPhoto) && (
          <div className="text-xs rounded-full bg-muted px-3 py-1 font-medium w-fit">
            DNI con frente y dorso cargados
          </div>
        )}
      </div>

      {/* Información Personal */}
      <ChildInfoSection title="Información Personal">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {child.name && (
            <div>
              <span className="font-medium block text-foreground">Nombre</span>
              <span className="text-muted-foreground">{child.name}</span>
            </div>
          )}
          {child.lastName && (
            <div>
              <span className="font-medium block text-foreground">
                Apellido
              </span>
              <span className="text-muted-foreground">{child.lastName}</span>
            </div>
          )}
          {child.birthDate && (
            <div>
              <span className="font-medium block text-foreground">
                Fecha de Nacimiento
              </span>
              <span className="text-muted-foreground">
                {child.birthDate.toLocaleDateString('es-AR')}
              </span>
            </div>
          )}
          {child.gender && (
            <div>
              <span className="font-medium block text-foreground">Género</span>
              <span className="text-muted-foreground">
                {child.gender === 'FEMALE'
                  ? 'Femenino'
                  : child.gender === 'MALE'
                    ? 'Masculino'
                    : child.gender === 'NON_BINARY'
                      ? 'No Binario'
                      : child.gender === 'UNDISCLOSED'
                        ? 'Prefiero no decirlo'
                        : 'Otro'}
              </span>
            </div>
          )}
          {child.nationality && (
            <div>
              <span className="font-medium block text-foreground">
                Nacionalidad
              </span>
              <span className="text-muted-foreground">{child.nationality}</span>
            </div>
          )}
          {child.maritalStatus && (
            <div>
              <span className="font-medium block text-foreground">
                Estado Civil
              </span>
              <span className="text-muted-foreground">
                {child.maritalStatus}
              </span>
            </div>
          )}
          {child.address && (
            <div className="col-span-2">
              <span className="font-medium block text-foreground">
                Domicilio
              </span>
              <span className="text-muted-foreground">{child.address}</span>
            </div>
          )}
        </div>
      </ChildInfoSection>

      {/* Documentación */}
      {(child.documentType ||
        child.documentNumber ||
        child.documentFrontPhoto ||
        child.documentBackPhoto) && (
        <ChildInfoSection title="Documentación">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {child.documentType && (
                <div>
                  <span className="font-medium block text-foreground">
                    Tipo de Documento
                  </span>
                  <span className="text-muted-foreground">
                    {child.documentType}
                  </span>
                </div>
              )}
              {child.documentNumber && (
                <div>
                  <span className="font-medium block text-foreground">
                    Número
                  </span>
                  <span className="text-muted-foreground">
                    {child.documentNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Document Photos */}
            <div className="grid grid-cols-2 gap-4">
              {child.documentFrontPhoto && (
                <div>
                  <span className="font-medium block text-foreground text-sm mb-2">
                    Foto Delantera
                  </span>
                  <img
                    src={child.documentFrontPhoto}
                    alt="Foto delantera del documento"
                    className="rounded-lg border border-border w-full max-h-64 object-cover"
                  />
                </div>
              )}
              {child.documentBackPhoto && (
                <div>
                  <span className="font-medium block text-foreground text-sm mb-2">
                    Foto Trasera
                  </span>
                  <img
                    src={child.documentBackPhoto}
                    alt="Foto trasera del documento"
                    className="rounded-lg border border-border w-full max-h-64 object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </ChildInfoSection>
      )}

      {/* Ficha Médica */}
      {[
        child.allergies,
        child.regularMedication,
        child.relevantDiseases,
        child.previousInjuries,
        child.physicalRestrictions,
        child.bloodGroup,
        child.primaryDoctor,
        child.doctorPhone,
        child.observations,
      ].some(Boolean) && (
        <ChildInfoSection title="Ficha Médica">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {child.allergies && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Alergias
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.allergies}
                </span>
              </div>
            )}
            {child.regularMedication && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Medicación Habitual
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.regularMedication}
                </span>
              </div>
            )}
            {child.relevantDiseases && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Enfermedades Relevantes
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.relevantDiseases}
                </span>
              </div>
            )}
            {child.previousInjuries && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Lesiones Previas
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.previousInjuries}
                </span>
              </div>
            )}
            {child.physicalRestrictions && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Restricciones Físicas
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.physicalRestrictions}
                </span>
              </div>
            )}
            {child.bloodGroup && (
              <div>
                <span className="font-medium block text-foreground">
                  Grupo Sanguíneo
                </span>
                <span className="text-muted-foreground">
                  {child.bloodGroup}
                </span>
              </div>
            )}
            {child.primaryDoctor && (
              <div>
                <span className="font-medium block text-foreground">
                  Médico de Cabecera
                </span>
                <span className="text-muted-foreground">
                  {child.primaryDoctor}
                </span>
              </div>
            )}
            {child.doctorPhone && (
              <div>
                <span className="font-medium block text-foreground">
                  Teléfono Médico
                </span>
                <span className="text-muted-foreground">
                  {child.doctorPhone}
                </span>
              </div>
            )}
            {child.observations && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Observaciones
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.observations}
                </span>
              </div>
            )}
          </div>
        </ChildInfoSection>
      )}

      {/* Actividades */}
      {child.activityParticipants.length > 0 && (
        <ChildInfoSection title="Actividades">
          <ul className="divide-y divide-border space-y-2">
            {child.activityParticipants.map((ap) => (
              <li key={ap.id} className="py-2 text-sm">
                <span className="font-medium">{ap.activity.name}</span>
                <span className="text-muted-foreground text-xs block mt-0.5">
                  {ap.activity.date.toLocaleDateString('es-AR')} · $
                  {ap.activity.price}
                </span>
              </li>
            ))}
          </ul>
        </ChildInfoSection>
      )}

      {child.activityParticipants.length === 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Sin actividades registradas.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify page structure and imports**

Run in terminal:

```bash
grep -n "export default async function ViewChildPage" src/app/admin/users/[id]/children/[childId]/view/page.tsx
```

Expected: Shows line confirming function exists.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/users/[id]/children/[childId]/view/page.tsx
git commit -m "feat: add child information view page"
```

---

### Task 3: Update Parent View Page with "Ver" Button

**Files:**

- Modify: `/src/app/admin/users/[id]/view/page.tsx:176-181`

- [ ] **Step 1: Read the current children list section**

Read the file to understand the current button structure:

```bash
sed -n '176,181p' src/app/admin/users/[id]/view/page.tsx
```

Expected output shows the current "Editar" button.

- [ ] **Step 2: Update the children list to include "Ver" button**

Find the section with the "Editar" button (around line 176-181) and replace it with:

```tsx
<div className="flex gap-2">
  <Link
    href={`/admin/users/${user.id}/children/${child.id}/view`}
    className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted transition-colors shrink-0"
  >
    Ver
  </Link>
  <Link
    href={`/admin/users/${user.id}/children/${child.id}/edit`}
    className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors shrink-0"
  >
    Editar
  </Link>
</div>
```

Replace this in the file:

```tsx
<Link
  href={`/admin/users/${user.id}/children/${child.id}/edit`}
  className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted transition-colors shrink-0"
>
  Editar
</Link>
```

With the code above (keeping all other code the same).

- [ ] **Step 3: Verify the change looks correct**

Run:

```bash
sed -n '176,195p' src/app/admin/users/[id]/view/page.tsx
```

Expected: Shows both "Ver" and "Editar" buttons in a flex container.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/users/[id]/view/page.tsx
git commit -m "feat: add 'Ver' button to child list in admin view"
```

---

## Testing

After all tasks are complete:

1. **Navigation Test**
   - Go to `/admin/users` and click on any user with children
   - Verify "Ver" button appears next to "Editar" button
   - Click "Ver" button
   - Verify page loads at `/admin/users/[id]/children/[childId]/view`

2. **Content Display Test**
   - Verify all expandable sections appear
   - Click each section header to expand/collapse
   - Verify all child data displays correctly
   - Verify document photos display as images
   - Verify activities list shows

3. **Navigation Test**
   - Click "Editar" button to verify it goes to edit page
   - Click "← Volver" to verify it returns to parent view

---

## Summary

- Creates reusable collapsible section component
- Implements read-only view page with all child information
- Updates parent view to include "Ver" button
- Separates view and edit functionality
- Includes activity participation display
