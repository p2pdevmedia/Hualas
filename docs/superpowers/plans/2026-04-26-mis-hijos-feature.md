# "Mis Hijos" Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a member-facing children management section with cards overview and detailed child views including activity history.

**Architecture:** Add "Mis Hijos" link to navbar Profile dropdown. New `/profile/children` page shows cards with health highlights. New `/profile/children/[childId]` view page displays all child data in expandable sections plus activity history (active/past separated). Reuse existing ChildInfoSection component and auth patterns.

**Tech Stack:** Next.js App Router, Prisma ORM, React, existing UI components, ChildInfoSection component

---

## File Structure

**New Files:**

- `/src/app/profile/children/page.tsx` — Children cards listing page
- `/src/app/profile/children/[childId]/page.tsx` — Child detail view page
- `/src/app/profile/children/[childId]/edit/page.tsx` — Child edit page (wrapper)

**Modified Files:**

- `/src/components/navbar.tsx` — Add "Mis Hijos" dropdown to Profile menu
- `/src/app/profile/page.tsx` — Update to handle children management routing
- `/src/lib/i18n.ts` — Add translation keys for "Mis Hijos"

---

## Tasks

### Task 1: Add Translation Keys

**Files:**

- Modify: `/src/lib/i18n.ts`

- [ ] **Step 1: Add translation keys to all language sections**

Update `/src/lib/i18n.ts` in the `actions` object for each language (es, pt, en, fr):

Spanish (es):

```typescript
myChildren: 'Mis Hijos',
addChild: 'Agregar hijo',
```

Portuguese (pt):

```typescript
myChildren: 'Meus Filhos',
addChild: 'Adicionar filho',
```

English (en):

```typescript
myChildren: 'My Children',
addChild: 'Add child',
```

French (fr):

```typescript
myChildren: 'Mes Enfants',
addChild: 'Ajouter un enfant',
```

Add these to the `actions` object in all 4 language sections.

- [ ] **Step 2: Verify keys are added**

Run:

```bash
grep -n "myChildren" src/lib/i18n.ts
```

Expected: Shows 4 matches (one per language)

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: add translation keys for Mis Hijos feature"
```

---

### Task 2: Update Navbar with Profile Dropdown

**Files:**

- Modify: `/src/components/navbar.tsx:200-208`

- [ ] **Step 1: Update navbar to include dropdown menu**

Find the Profile link section (around lines 200-208) and replace the simple profile link with a dropdown menu:

```tsx
<div className="relative group">
  <button className={linkClass}>{t.profile}</button>
  <div className="absolute right-0 top-full hidden group-hover:block bg-card border rounded-md shadow-lg z-50 min-w-48">
    <Link
      href="/profile"
      className="block w-full text-left px-4 py-2 hover:bg-muted text-sm"
    >
      {t.profile}
    </Link>
    <Link
      href="/profile/children"
      className="block w-full text-left px-4 py-2 hover:bg-muted text-sm border-t"
    >
      {t.myChildren}
    </Link>
  </div>
</div>
```

Replace the original:

```tsx
<Link href="/profile" className={linkClass}>
  {t.profile}
</Link>
```

With the dropdown code above (keeping the logout button after).

- [ ] **Step 2: Update navbar import for translation**

Ensure `t` is imported from translations at the top of the file (it should already be):

```bash
grep -n "useTranslation()" src/components/navbar.tsx
```

Expected: Shows line with `const t = useTranslation().nav;`

- [ ] **Step 3: Commit**

```bash
git add src/components/navbar.tsx
git commit -m "feat: add Mis Hijos dropdown to profile menu in navbar"
```

---

### Task 3: Create Children Cards Page

**Files:**

- Create: `/src/app/profile/children/page.tsx`

- [ ] **Step 1: Create the children cards page**

Create `/src/app/profile/children/page.tsx`:

```tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ChildrenPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      children: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Mis Hijos</h1>
        <Link
          href="/profile"
          className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          Agregar hijo
        </Link>
      </div>

      {user.children.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">
            No tienes hijos registrados.
          </p>
          <Link
            href="/profile"
            className="inline-flex mt-4 h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            Agregar hijo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {user.children.map((child) => (
            <div
              key={child.id}
              className="rounded-xl border bg-card p-4 shadow-sm space-y-3"
            >
              {/* Child Info */}
              <div className="space-y-2">
                <h2 className="font-semibold">
                  {child.name} {child.lastName}
                </h2>
                {child.birthDate && (
                  <p className="text-xs text-muted-foreground">
                    {new Date().getFullYear() - child.birthDate.getFullYear()}{' '}
                    años
                  </p>
                )}
              </div>

              {/* Health Highlights */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
                {child.bloodGroup && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Grupo sanguíneo:</span>{' '}
                    {child.bloodGroup}
                  </p>
                )}
                {child.allergies && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Alergias:</span>{' '}
                    {child.allergies.substring(0, 50)}
                    {child.allergies.length > 50 ? '...' : ''}
                  </p>
                )}
                {child.primaryDoctor && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Médico:</span>{' '}
                    {child.primaryDoctor}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <Link
                  href={`/profile/children/${child.id}`}
                  className="flex-1 inline-flex h-8 items-center justify-center rounded-full border border-border px-3 text-xs font-medium hover:bg-muted transition-colors"
                >
                  Ver
                </Link>
                <Link
                  href={`/profile/children/${child.id}/edit`}
                  className="flex-1 inline-flex h-8 items-center justify-center rounded-full border border-primary px-3 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/profile"
        className="inline-block text-sm text-primary hover:text-primary/80 underline underline-offset-4"
      >
        ← Volver al perfil
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify page structure**

Run:

```bash
grep -n "export default async function ChildrenPage" src/app/profile/children/page.tsx
```

Expected: Shows line confirming function exists

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/children/page.tsx
git commit -m "feat: add children cards listing page for members"
```

---

### Task 4: Create Child View Page with Activity History

**Files:**

- Create: `/src/app/profile/children/[childId]/page.tsx`

- [ ] **Step 1: Create the child view page**

Create `/src/app/profile/children/[childId]/page.tsx`:

```tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChildInfoSection from '@/components/child-info-section';

export default async function ViewMyChildPage({
  params,
}: {
  params: { childId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const child = await prisma.child.findUnique({
    where: { id: params.childId },
    include: {
      user: true,
      activityParticipants: { include: { activity: true } },
    },
  });

  if (!child || child.userId !== (session.user as any).id) {
    redirect('/profile/children');
  }

  const now = new Date();
  const activeActivities = child.activityParticipants.filter(
    (ap) => ap.activity.date >= now
  );
  const pastActivities = child.activityParticipants.filter(
    (ap) => ap.activity.date < now
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {child.name} {child.lastName}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/profile/children/${params.childId}/edit`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              Editar
            </Link>
            <Link
              href="/profile/children"
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

      {/* Actividades - Active/Upcoming */}
      {activeActivities.length > 0 && (
        <ChildInfoSection title="Actividades Próximas" defaultOpen={true}>
          <ul className="divide-y divide-border space-y-2">
            {activeActivities.map((ap) => (
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

      {/* Actividades - Past */}
      {pastActivities.length > 0 && (
        <ChildInfoSection title="Historial de Actividades" defaultOpen={false}>
          <ul className="divide-y divide-border space-y-2">
            {pastActivities.map((ap) => (
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

- [ ] **Step 2: Verify page structure**

Run:

```bash
grep -n "export default async function ViewMyChildPage" src/app/profile/children/[childId]/page.tsx
```

Expected: Shows line confirming function exists

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/children/[childId]/page.tsx
git commit -m "feat: add child detail view page with activity history for members"
```

---

### Task 5: Create Child Edit Page Wrapper

**Files:**

- Create: `/src/app/profile/children/[childId]/edit/page.tsx`

- [ ] **Step 1: Create edit page wrapper**

Create `/src/app/profile/children/[childId]/edit/page.tsx`:

```tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChildEditForm from './form';

export default async function EditChildPage({
  params,
}: {
  params: { childId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const child = await prisma.child.findUnique({
    where: { id: params.childId },
    include: { user: true },
  });

  if (!child || child.userId !== (session.user as any).id) {
    redirect('/profile/children');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editar {child.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Actualiza los datos de tu hijo
          </p>
        </div>
        <Link
          href={`/profile/children/${params.childId}`}
          className="inline-block text-sm text-primary hover:text-primary/80 underline underline-offset-4"
        >
          ← Volver
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ChildEditForm child={child} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the edit form component**

Create `/src/app/profile/children/[childId]/edit/form.tsx` - This will be a client component that handles the edit form. For now, create a basic structure:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Child } from '@prisma/client';

interface ChildEditFormProps {
  child: Child & { user: { address: string | null } };
}

export default function ChildEditForm({ child }: ChildEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(child.name);
  const [lastName, setLastName] = useState(child.lastName ?? '');
  const [birthDate, setBirthDate] = useState(
    child.birthDate ? child.birthDate.toISOString().split('T')[0] : ''
  );
  const [documentType, setDocumentType] = useState(child.documentType ?? '');
  const [documentNumber, setDocumentNumber] = useState(
    child.documentNumber ?? ''
  );
  const [address, setAddress] = useState(child.address ?? '');
  const [gender, setGender] = useState(child.gender ?? '');
  const [nationality, setNationality] = useState(child.nationality ?? '');
  const [maritalStatus, setMaritalStatus] = useState(child.maritalStatus ?? '');
  const [allergies, setAllergies] = useState(child.allergies ?? '');
  const [regularMedication, setRegularMedication] = useState(
    child.regularMedication ?? ''
  );
  const [relevantDiseases, setRelevantDiseases] = useState(
    child.relevantDiseases ?? ''
  );
  const [previousInjuries, setPreviousInjuries] = useState(
    child.previousInjuries ?? ''
  );
  const [physicalRestrictions, setPhysicalRestrictions] = useState(
    child.physicalRestrictions ?? ''
  );
  const [bloodGroup, setBloodGroup] = useState(child.bloodGroup ?? '');
  const [primaryDoctor, setPrimaryDoctor] = useState(child.primaryDoctor ?? '');
  const [doctorPhone, setDoctorPhone] = useState(child.doctorPhone ?? '');
  const [observations, setObservations] = useState(child.observations ?? '');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/users/${child.userId}/children/${child.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            lastName,
            birthDate: birthDate ? new Date(birthDate) : null,
            documentType,
            documentNumber,
            address,
            gender: gender || undefined,
            nationality,
            maritalStatus,
            allergies,
            regularMedication,
            relevantDiseases,
            previousInjuries,
            physicalRestrictions,
            bloodGroup,
            primaryDoctor,
            doctorPhone,
            observations,
          }),
        }
      );

      if (res.ok) {
        router.push(`/profile/children/${child.id}`);
      }
    } catch (error) {
      console.error('Error updating child:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
        />
        <input
          className={inputClass}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Apellido"
        />
      </div>

      <select
        className={inputClass}
        value={documentType}
        onChange={(e) => setDocumentType(e.target.value)}
      >
        <option value="">Tipo de documento</option>
        <option value="DNI">DNI</option>
        <option value="PASAPORTE">Pasaporte</option>
        <option value="OTRO">Otro</option>
      </select>

      <input
        className={inputClass}
        value={documentNumber}
        onChange={(e) => setDocumentNumber(e.target.value)}
        placeholder="Número / Código"
      />

      <input
        className={inputClass}
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
      />

      <input
        className={inputClass}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Domicilio"
      />

      <select
        className={inputClass}
        value={gender}
        onChange={(e) => setGender(e.target.value)}
      >
        <option value="">Género</option>
        <option value="FEMALE">Femenino</option>
        <option value="MALE">Masculino</option>
        <option value="NON_BINARY">No Binario</option>
        <option value="UNDISCLOSED">Prefiero no decirlo</option>
        <option value="OTHER">Otro</option>
      </select>

      <input
        className={inputClass}
        value={nationality}
        onChange={(e) => setNationality(e.target.value)}
        placeholder="Nacionalidad"
      />

      <input
        className={inputClass}
        value={maritalStatus}
        onChange={(e) => setMaritalStatus(e.target.value)}
        placeholder="Estado Civil"
      />

      {/* Medical Sheet */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Ficha médica</h3>
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="Alergias"
        />
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={regularMedication}
          onChange={(e) => setRegularMedication(e.target.value)}
          placeholder="Medicación habitual"
        />
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={relevantDiseases}
          onChange={(e) => setRelevantDiseases(e.target.value)}
          placeholder="Enfermedades relevantes"
        />
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={previousInjuries}
          onChange={(e) => setPreviousInjuries(e.target.value)}
          placeholder="Lesiones previas"
        />
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={physicalRestrictions}
          onChange={(e) => setPhysicalRestrictions(e.target.value)}
          placeholder="Restricciones físicas"
        />
        <input
          className={inputClass}
          value={bloodGroup}
          onChange={(e) => setBloodGroup(e.target.value)}
          placeholder="Grupo sanguíneo"
        />
        <input
          className={inputClass}
          value={primaryDoctor}
          onChange={(e) => setPrimaryDoctor(e.target.value)}
          placeholder="Médico de cabecera"
        />
        <input
          className={inputClass}
          value={doctorPhone}
          onChange={(e) => setDoctorPhone(e.target.value)}
          placeholder="Teléfono médico"
        />
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Observaciones"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Verify files created**

Run:

```bash
ls -la src/app/profile/children/[childId]/edit/
```

Expected: Shows both `page.tsx` and `form.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/children/[childId]/edit/
git commit -m "feat: add child edit page for members"
```

---

## Testing

After all tasks are complete:

1. **Navigation Test**
   - Log in as a MEMBER user
   - Hover over Profile in navbar
   - Verify "Mis Hijos" dropdown appears
   - Click "Mis Hijos"
   - Verify page loads at `/profile/children`

2. **Cards Page Test**
   - Verify all children display as cards
   - Verify health highlights show (blood group, allergies, doctor)
   - Verify "Ver" and "Editar" buttons appear
   - Click "Ver" → verify navigates to view page
   - Click "Editar" → verify navigates to edit page

3. **View Page Test**
   - Verify all expandable sections appear
   - Click each section to expand/collapse
   - Verify activity history separated into active/past
   - Click "Editar" button → verify navigates to edit page
   - Click "← Volver" → verify returns to cards page

4. **Edit Page Test**
   - Verify form loads with current child data
   - Update a field (e.g., allergies)
   - Click "Guardar cambios"
   - Verify redirects to view page
   - Verify changes persist

5. **Auth Test**
   - Log in as ADMIN user
   - Verify "Mis Hijos" does NOT appear in profile dropdown
   - Log in as MEMBER
   - Try accessing `/profile/children/[other-user-child-id]`
   - Verify redirect to `/profile/children`

---

## Summary

- Adds "Mis Hijos" to Profile dropdown for MEMBER users only
- Creates cards listing with health highlights and action buttons
- Creates detailed view page with expandable sections and activity history
- Implements member-only auth checks to prevent cross-access
- Reuses ChildInfoSection component for consistency with admin view
