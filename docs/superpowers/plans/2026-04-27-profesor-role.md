# Profesor Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PROFESSOR role that allows admins to assign professors to activities, professors to manage weekly sessions with geo-location, and enrolled members to confirm/decline attendance per session.

**Architecture:** New `PROFESSOR` enum value + three new DB models (`ActivityProfessor`, `ActivitySession`, `SessionAttendance`). Five new API routes. Existing `/my-activities` page extended for professors. React-Leaflet used for interactive map picker (SSR-safe with `next/dynamic`).

**Tech Stack:** Next.js 14 App Router, Prisma + PostgreSQL (Neon), TypeScript, Tailwind CSS, NextAuth, react-leaflet + leaflet

---

## File Map

### New files
- `prisma/migrations/20260427000002_add_profesor_role/migration.sql`
- `src/app/api/activities/[id]/professors/route.ts`
- `src/app/api/activities/[id]/professors/[userId]/route.ts`
- `src/app/api/activities/[id]/sessions/route.ts`
- `src/app/api/sessions/[id]/attendance/route.ts`
- `src/components/map-picker.tsx`
- `src/components/map-preview.tsx`
- `src/app/my-activities/[id]/sessions/new/page.tsx`
- `src/app/my-activities/[id]/sessions/new/form.tsx`

### Modified files
- `prisma/schema.prisma` — add PROFESSOR, 3 new models, AttendanceStatus enum
- `src/types/next-auth.d.ts` — add PROFESSOR to role union types
- `src/app/activities/[id]/edit/form.tsx` — add professors panel at bottom
- `src/app/activities/[id]/edit/page.tsx` — pass professors to form
- `src/app/my-activities/page.tsx` — add professor view branch
- `src/app/activities/[id]/page.tsx` — add sessions section for enrolled members
- `src/components/navbar.tsx` — PROFESSOR goes to /my-activities

---

## Task 1: Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260427000002_add_profesor_role/migration.sql`

- [ ] **Step 1: Update prisma/schema.prisma**

Add `PROFESSOR` to the Role enum and add the three new models. Replace the Role enum and Activity/User models with the additions below.

In `prisma/schema.prisma`, change:

```prisma
enum Role {
  ADMIN
  MEMBER
  SUPER_ADMIN
}
```

to:

```prisma
enum Role {
  ADMIN
  MEMBER
  SUPER_ADMIN
  PROFESSOR
}
```

Add the `AttendanceStatus` enum at the bottom of the file (before or after the Role enum):

```prisma
enum AttendanceStatus {
  CONFIRMED
  DECLINED
}
```

Add `professors` and `sessions` relations to the `Activity` model:

```prisma
model Activity {
  id           String                @id @default(cuid())
  name         String
  date         DateTime
  frequency    ActivityFrequency     @default(ONE_TIME)
  image        String?
  description  String?
  price        Int                   @default(0)
  capacity     Int?
  participants ActivityParticipant[]
  professors   ActivityProfessor[]
  sessions     ActivitySession[]
  createdAt    DateTime              @default(now())
}
```

Add `professors` and `createdSessions` relations to the `User` model (append to the existing User model fields):

```prisma
  professors           ActivityProfessor[]
  createdSessions      ActivitySession[]   @relation("SessionsCreated")
```

Add the three new models after the `Child` model:

```prisma
model ActivityProfessor {
  id         String   @id @default(cuid())
  activityId String
  userId     String
  createdAt  DateTime @default(now())
  activity   Activity @relation(fields: [activityId], references: [id])
  user       User     @relation(fields: [userId], references: [id])

  @@unique([activityId, userId])
}

model ActivitySession {
  id          String              @id @default(cuid())
  activityId  String
  createdById String
  date        DateTime
  startTime   String
  endTime     String
  description String?
  lat         Float
  lng         Float
  createdAt   DateTime            @default(now())
  activity    Activity            @relation(fields: [activityId], references: [id])
  createdBy   User                @relation("SessionsCreated", fields: [createdById], references: [id])
  attendances SessionAttendance[]
}

model SessionAttendance {
  id            String              @id @default(cuid())
  sessionId     String
  participantId String
  status        AttendanceStatus
  updatedAt     DateTime            @updatedAt
  session       ActivitySession     @relation(fields: [sessionId], references: [id])
  participant   ActivityParticipant @relation(fields: [participantId], references: [id])

  @@unique([sessionId, participantId])
}
```

Add `attendances` relation to `ActivityParticipant`:

```prisma
model ActivityParticipant {
  id            String              @id @default(cuid())
  activityId    String
  userId        String
  childId       String?
  participantKey String             @unique
  receipt       String?
  receiptDate   DateTime?
  activity      Activity            @relation(fields: [activityId], references: [id])
  user          User                @relation(fields: [userId], references: [id])
  child         Child?              @relation(fields: [childId], references: [id])
  attendances   SessionAttendance[]
}
```

- [ ] **Step 2: Create migration SQL file**

Create directory and file:
```
prisma/migrations/20260427000002_add_profesor_role/migration.sql
```

Content:
```sql
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('CONFIRMED', 'DECLINED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PROFESSOR';

-- CreateTable
CREATE TABLE "ActivityProfessor" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityProfessor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivitySession" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "description" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivitySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAttendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityProfessor_activityId_userId_key" ON "ActivityProfessor"("activityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionAttendance_sessionId_participantId_key" ON "SessionAttendance"("sessionId", "participantId");

-- AddForeignKey
ALTER TABLE "ActivityProfessor" ADD CONSTRAINT "ActivityProfessor_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityProfessor" ADD CONSTRAINT "ActivityProfessor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySession" ADD CONSTRAINT "ActivitySession_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySession" ADD CONSTRAINT "ActivitySession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ActivitySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ActivityParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply migration and regenerate client**

```bash
npx prisma migrate deploy
npx prisma generate
```

Expected: "1 migration applied" and "Generated Prisma Client".

- [ ] **Step 4: Verify build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds (or only pre-existing errors, none new).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260427000002_add_profesor_role/
git commit -m "feat: add PROFESSOR role, ActivityProfessor, ActivitySession, SessionAttendance to schema"
```

---

## Task 2: NextAuth Types

**Files:**
- Modify: `src/types/next-auth.d.ts`

- [ ] **Step 1: Add PROFESSOR to role unions**

Current file content:
```typescript
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';
    };
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';
  }
}
```

Replace ALL three role union types to include `'PROFESSOR'`:

```typescript
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN' | 'PROFESSOR';
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN' | 'PROFESSOR';
    };
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN' | 'PROFESSOR';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/next-auth.d.ts
git commit -m "feat: add PROFESSOR to NextAuth role types"
```

---

## Task 3: API — Professor Assignment

**Files:**
- Create: `src/app/api/activities/[id]/professors/route.ts`
- Create: `src/app/api/activities/[id]/professors/[userId]/route.ts`

- [ ] **Step 1: Create GET/POST route for listing and assigning professors**

Create `src/app/api/activities/[id]/professors/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const professors = await prisma.activityProfessor.findMany({
    where: { activityId: params.id },
    include: { user: { select: { id: true, name: true, lastName: true, email: true } } },
  });

  return NextResponse.json(professors);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body as { userId: string };
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'PROFESSOR') {
    return NextResponse.json({ error: 'User is not a PROFESSOR' }, { status: 400 });
  }

  const existing = await prisma.activityProfessor.findUnique({
    where: { activityId_userId: { activityId: params.id, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Already assigned' }, { status: 409 });
  }

  const ap = await prisma.activityProfessor.create({
    data: { activityId: params.id, userId },
    include: { user: { select: { id: true, name: true, lastName: true, email: true } } },
  });

  return NextResponse.json(ap, { status: 201 });
}
```

- [ ] **Step 2: Create DELETE route for removing a professor**

Create `src/app/api/activities/[id]/professors/[userId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.activityProfessor.deleteMany({
    where: { activityId: params.id, userId: params.userId },
  });

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/activities/
git commit -m "feat: add professor assignment API (GET/POST/DELETE)"
```

---

## Task 4: API — Sessions

**Files:**
- Create: `src/app/api/activities/[id]/sessions/route.ts`

- [ ] **Step 1: Create GET/POST route for sessions**

Create `src/app/api/activities/[id]/sessions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await prisma.activitySession.findMany({
    where: { activityId: params.id },
    orderBy: { date: 'asc' },
    include: {
      createdBy: { select: { id: true, name: true, lastName: true } },
      attendances: true,
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PROFESSOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const assignment = await prisma.activityProfessor.findUnique({
    where: { activityId_userId: { activityId: params.id, userId: session.user.id } },
  });
  if (!assignment) {
    return NextResponse.json({ error: 'Not assigned to this activity' }, { status: 403 });
  }

  const body = await req.json();
  const { date, startTime, endTime, description, lat, lng } = body as {
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
    lat: number;
    lng: number;
  };

  if (!date || !startTime || !endTime || lat == null || lng == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newSession = await prisma.activitySession.create({
    data: {
      activityId: params.id,
      createdById: session.user.id,
      date: new Date(date),
      startTime,
      endTime,
      description: description || null,
      lat,
      lng,
    },
  });

  return NextResponse.json(newSession, { status: 201 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/activities/
git commit -m "feat: add sessions API (GET/POST)"
```

---

## Task 5: API — Attendance

**Files:**
- Create: `src/app/api/sessions/[id]/attendance/route.ts`

- [ ] **Step 1: Create PATCH and GET route for attendance**

Create directory `src/app/api/sessions/[id]/attendance/` and file `route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actSession = await prisma.activitySession.findUnique({
    where: { id: params.id },
  });
  if (!actSession) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const participant = await prisma.activityParticipant.findFirst({
    where: { activityId: actSession.activityId, userId: session.user.id },
  });
  if (!participant) {
    return NextResponse.json({ error: 'Not enrolled' }, { status: 403 });
  }

  const attendance = await prisma.sessionAttendance.findUnique({
    where: { sessionId_participantId: { sessionId: params.id, participantId: participant.id } },
  });

  return NextResponse.json({ status: attendance?.status ?? null });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actSession = await prisma.activitySession.findUnique({
    where: { id: params.id },
  });
  if (!actSession) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const participant = await prisma.activityParticipant.findFirst({
    where: { activityId: actSession.activityId, userId: session.user.id },
  });
  if (!participant) {
    return NextResponse.json({ error: 'Not enrolled in this activity' }, { status: 403 });
  }

  const body = await req.json();
  const { status } = body as { status: 'CONFIRMED' | 'DECLINED' };
  if (status !== 'CONFIRMED' && status !== 'DECLINED') {
    return NextResponse.json({ error: 'status must be CONFIRMED or DECLINED' }, { status: 400 });
  }

  const attendance = await prisma.sessionAttendance.upsert({
    where: { sessionId_participantId: { sessionId: params.id, participantId: participant.id } },
    create: { sessionId: params.id, participantId: participant.id, status },
    update: { status },
  });

  return NextResponse.json(attendance);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/sessions/
git commit -m "feat: add session attendance API (GET/PATCH)"
```

---

## Task 6: Install Leaflet + Map Components

**Files:**
- Create: `src/components/map-picker.tsx`
- Create: `src/components/map-preview.tsx`

- [ ] **Step 1: Install react-leaflet dependencies**

```bash
npm install leaflet react-leaflet
npm install --save-dev @types/leaflet
```

Expected: packages added to node_modules and package-lock.json updated.

- [ ] **Step 2: Create MapPicker component**

Create `src/components/map-picker.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Patagonia default center: San Martín de los Andes
    const defaultLat = lat ?? -40.1572;
    const defaultLng = lng ?? -71.3527;

    import('leaflet').then((L) => {
      // Fix default icon paths broken by webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!).setView([defaultLat, defaultLng], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      if (lat != null && lng != null) {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChange(pos.lat, pos.lng);
        });
      }

      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
        } else {
          const marker = L.marker([clickLat, clickLng], { draggable: true }).addTo(map);
          markerRef.current = marker;
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onChange(pos.lat, pos.lng);
          });
        }
        onChange(clickLat, clickLng);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={containerRef} className="h-64 w-full rounded-lg border" />
      {lat != null && lng != null && (
        <p className="text-xs text-muted-foreground mt-1">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </>
  );
}
```

- [ ] **Step 3: Create MapPreview component (read-only)**

Create `src/components/map-preview.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';

interface MapPreviewProps {
  lat: number;
  lng: number;
  height?: string;
}

export default function MapPreview({ lat, lng, height = 'h-36' }: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, { zoomControl: false, dragging: false, scrollWheelZoom: false }).setView([lat, lng], 14);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      L.marker([lat, lng]).addTo(map);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={containerRef} className={`${height} w-full rounded-lg border`} />
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/map-picker.tsx src/components/map-preview.tsx package.json package-lock.json
git commit -m "feat: add MapPicker and MapPreview components using react-leaflet"
```

---

## Task 7: Admin Edit Form — Professors Panel

**Files:**
- Modify: `src/app/activities/[id]/edit/page.tsx`
- Modify: `src/app/activities/[id]/edit/form.tsx`

- [ ] **Step 1: Pass professors to the edit page**

In `src/app/activities/[id]/edit/page.tsx`, update the Prisma query to include professors, then pass them to the form.

Replace the existing `prisma.activity.findUnique` call:

```typescript
const activity = await prisma.activity.findUnique({
  where: { id: params.id },
  include: {
    professors: {
      include: {
        user: { select: { id: true, name: true, lastName: true, email: true } },
      },
    },
  },
});
```

Add a query to get all users with PROFESSOR role:

```typescript
const allProfessors = await prisma.user.findMany({
  where: { role: 'PROFESSOR' },
  select: { id: true, name: true, lastName: true, email: true },
  orderBy: { name: 'asc' },
});
```

Pass both to the form:

```typescript
<EditActivityForm
  activity={{
    ...activity,
    date: activity.date.toISOString().split('T')[0],
    professors: activity.professors.map((ap) => ({
      id: ap.id,
      userId: ap.userId,
      user: ap.user,
    })),
  }}
  allProfessors={allProfessors}
/>
```

The full updated `src/app/activities/[id]/edit/page.tsx`:

```typescript
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EditActivityForm from './form';

export default async function EditActivityPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  const [activity, allProfessors] = await Promise.all([
    prisma.activity.findUnique({
      where: { id: params.id },
      include: {
        professors: {
          include: {
            user: { select: { id: true, name: true, lastName: true, email: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: 'PROFESSOR' },
      select: { id: true, name: true, lastName: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!activity) redirect('/activities');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Editar actividad</h1>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <EditActivityForm
          activity={{
            id: activity.id,
            name: activity.name,
            date: activity.date.toISOString().split('T')[0],
            frequency: activity.frequency,
            image: activity.image,
            description: activity.description,
            price: activity.price,
            capacity: activity.capacity,
            professors: activity.professors.map((ap) => ({
              id: ap.id,
              userId: ap.userId,
              user: ap.user,
            })),
          }}
          allProfessors={allProfessors}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add professors panel to the edit form**

Add the new props types and professors panel to `src/app/activities/[id]/edit/form.tsx`.

At the top, after the existing `EditActivityFormProps` interface, the `activity` prop type should include:

```typescript
interface EditActivityFormProps {
  activity: {
    id: string;
    name: string;
    date: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME';
    image?: string | null;
    description?: string | null;
    price: number;
    capacity?: number | null;
    professors: Array<{
      id: string;
      userId: string;
      user: { id: string; name: string | null; lastName: string | null; email: string };
    }>;
  };
  allProfessors: Array<{
    id: string;
    name: string | null;
    lastName: string | null;
    email: string;
  }>;
}
```

Add state for professors at the top of the component (after existing state declarations):

```typescript
const [professors, setProfessors] = useState(activity.professors);
const [selectedProfId, setSelectedProfId] = useState('');
const [profError, setProfError] = useState('');
```

Add handlers:

```typescript
async function assignProfessor() {
  if (!selectedProfId) return;
  setProfError('');
  const res = await fetch(`/api/activities/${activity.id}/professors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: selectedProfId }),
  });
  if (!res.ok) {
    setProfError('No se pudo asignar el profesor');
    return;
  }
  const newAp = await res.json();
  setProfessors((prev) => [...prev, newAp]);
  setSelectedProfId('');
}

async function removeProfessor(userId: string) {
  const res = await fetch(`/api/activities/${activity.id}/professors/${userId}`, {
    method: 'DELETE',
  });
  if (res.ok || res.status === 204) {
    setProfessors((prev) => prev.filter((p) => p.userId !== userId));
  }
}
```

Add the professors panel JSX at the bottom of the `<form>` element (before the submit button):

```tsx
<div className="rounded-lg border bg-muted/20 p-4 space-y-3">
  <h3 className="text-sm font-semibold">Profesores</h3>
  {professors.length === 0 ? (
    <p className="text-xs text-muted-foreground">Sin profesores asignados.</p>
  ) : (
    <ul className="space-y-1">
      {professors.map((ap) => (
        <li key={ap.id} className="flex items-center justify-between text-sm">
          <span>
            {ap.user.name ?? ''} {ap.user.lastName ?? ''}{' '}
            <span className="text-muted-foreground text-xs">({ap.user.email})</span>
          </span>
          <button
            type="button"
            onClick={() => removeProfessor(ap.userId)}
            className="text-destructive text-xs hover:underline"
          >
            Quitar
          </button>
        </li>
      ))}
    </ul>
  )}
  <div className="flex gap-2">
    <select
      className={inputClass}
      value={selectedProfId}
      onChange={(e) => setSelectedProfId(e.target.value)}
    >
      <option value="">Seleccionar profesor...</option>
      {allProfessors
        .filter((p) => !professors.some((ap) => ap.userId === p.id))
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name ?? ''} {p.lastName ?? ''} ({p.email})
          </option>
        ))}
    </select>
    <button
      type="button"
      onClick={assignProfessor}
      className="shrink-0 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
    >
      Agregar
    </button>
  </div>
  {profError && <p className="text-destructive text-xs">{profError}</p>}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/activities/
git commit -m "feat: add professors panel to activity edit form"
```

---

## Task 8: Professor — Session Creation Page

**Files:**
- Create: `src/app/my-activities/[id]/sessions/new/page.tsx`
- Create: `src/app/my-activities/[id]/sessions/new/form.tsx`

- [ ] **Step 1: Create the page (server component)**

Create `src/app/my-activities/[id]/sessions/new/page.tsx`:

```typescript
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SessionForm from './form';

export default async function NewSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'PROFESSOR') {
    redirect('/');
  }

  const assignment = await prisma.activityProfessor.findUnique({
    where: {
      activityId_userId: { activityId: params.id, userId: session.user.id },
    },
    include: { activity: { select: { id: true, name: true } } },
  });

  if (!assignment) redirect('/my-activities');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nueva sesión</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {assignment.activity.name}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <SessionForm activityId={params.id} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the session form (client component)**

Create `src/app/my-activities/[id]/sessions/new/form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

const MapPicker = dynamic(() => import('@/components/map-picker'), { ssr: false });

export default function SessionForm({ activityId }: { activityId: string }) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (lat == null || lng == null) {
      setError('Seleccioná un punto en el mapa');
      return;
    }
    try {
      const res = await fetch(`/api/activities/${activityId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, startTime, endTime, description, lat, lng }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('Sesión creada');
      setTimeout(() => router.push('/my-activities'), 1000);
    } catch {
      setError('No se pudo crear la sesión');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Fecha</label>
        <input
          type="date"
          className={inputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Hora inicio</label>
          <input
            type="time"
            className={inputClass}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Hora fin (estimada)</label>
          <input
            type="time"
            className={inputClass}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Descripción</label>
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles del encuentro, condiciones, equipamiento..."
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">
          Punto de encuentro — hacé click en el mapa para colocar el pin
        </label>
        <MapPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Crear sesión
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/my-activities/
git commit -m "feat: add professor session creation page"
```

---

## Task 9: My Activities — Professor View

**Files:**
- Modify: `src/app/my-activities/page.tsx`

- [ ] **Step 1: Extend the page to show professor activities**

Replace the entire contents of `src/app/my-activities/page.tsx` with:

```typescript
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import dynamic from 'next/dynamic';

const MapPreview = dynamic(() => import('@/components/map-preview'), { ssr: false });

const frequencyLabels: Record<
  'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME',
  string
> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  ONE_TIME: 'Un solo pago',
};

export default async function MyActivitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const userId = session.user.id;
  const isProfessor = session.user.role === 'PROFESSOR';

  if (isProfessor) {
    const assignments = await prisma.activityProfessor.findMany({
      where: { userId },
      include: {
        activity: {
          include: {
            sessions: {
              orderBy: { date: 'asc' },
            },
          },
        },
      },
      orderBy: { activity: { date: 'asc' } },
    });

    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Mis actividades</h1>
          <p className="text-sm text-muted-foreground">
            Actividades en las que sos profesor.
          </p>
        </div>

        {assignments.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>Todavía no tenés actividades asignadas.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {assignments.map(({ activity }) => (
              <li key={activity.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/activities/${activity.id}`}
                      className="text-base font-semibold hover:text-primary transition-colors"
                    >
                      {activity.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>{frequencyLabels[activity.frequency as keyof typeof frequencyLabels]}</span>
                      <span>·</span>
                      <span>${activity.price}</span>
                    </div>
                    {activity.description && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/my-activities/${activity.id}/sessions/new`}
                    className="shrink-0 inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    Nueva sesión
                  </Link>
                </div>

                {activity.sessions.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-3">
                    <p className="text-sm font-medium">
                      Sesiones ({activity.sessions.length})
                    </p>
                    <ul className="space-y-3">
                      {activity.sessions.map((s) => (
                        <li key={s.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              {new Date(s.date).toLocaleDateString('es-AR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}
                            </span>
                            <span className="text-muted-foreground">
                              {s.startTime} – {s.endTime}
                            </span>
                          </div>
                          {s.description && (
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                          )}
                          <MapPreview lat={s.lat} lng={s.lng} height="h-32" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activity.sessions.length === 0 && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-3">
                    Sin sesiones creadas aún.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  // MEMBER view (existing behavior)
  let participations: Array<{
    id: string;
    childId: string | null;
    child: { id: string; name: string; lastName: string | null } | null;
    activity: {
      id: string;
      name: string;
      date: Date;
      frequency: string;
      price: number;
    };
  }> = [];

  try {
    participations = await prisma.activityParticipant.findMany({
      where: {
        OR: [{ userId }, { child: { userId } }],
      },
      include: {
        activity: true,
        child: { select: { id: true, name: true, lastName: true } },
      },
      orderBy: { activity: { date: 'asc' } },
    });
  } catch {
    participations = [];
  }

  const grouped = new Map<
    string,
    {
      activity: (typeof participations)[number]['activity'];
      participants: Array<{ label: string }>;
    }
  >();

  for (const p of participations) {
    const key = p.activity.id;
    const label = p.child
      ? `${p.child.name}${p.child.lastName ? ` ${p.child.lastName}` : ''}`
      : session.user.name ?? 'Yo';
    const entry = grouped.get(key);
    if (entry) {
      entry.participants.push({ label });
    } else {
      grouped.set(key, {
        activity: p.activity,
        participants: [{ label }],
      });
    }
  }

  const items = Array.from(grouped.values());

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mis actividades</h1>
        <p className="text-sm text-muted-foreground">
          Actividades en las que estás inscripto vos o alguno de tus hijos.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p>Todavía no estás inscripto en ninguna actividad.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(({ activity, participants }) => (
            <li
              key={activity.id}
              className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/activities/${activity.id}`}
                  className="text-base font-semibold transition-colors hover:text-primary"
                >
                  {activity.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>
                    {frequencyLabels[activity.frequency as keyof typeof frequencyLabels]}
                  </span>
                  <span>·</span>
                  <span>${activity.price}</span>
                  <span>·</span>
                  <span>{participants.map((x) => x.label).join(', ')}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/my-activities/page.tsx
git commit -m "feat: extend my-activities page with professor view and session display"
```

---

## Task 10: Activity Detail — Sessions for Enrolled Members

**Files:**
- Modify: `src/app/activities/[id]/page.tsx`

- [ ] **Step 1: Add sessions section for enrolled members**

In `src/app/activities/[id]/page.tsx`, update the Prisma query to include sessions, add a check for current user enrollment, and render the sessions section.

First, update the prisma query inside the try block to also include sessions:

```typescript
activity = await prisma.activity.findUnique({
  where: { id: params.id },
  include: {
    participants: isAdmin
      ? { include: { user: true, child: true } }
      : true,
    sessions: {
      orderBy: { date: 'asc' },
    },
  },
});
```

After the existing `const isFull = ...` line, add:

```typescript
const userId = (session?.user as any)?.id as string | undefined;
const isEnrolled = userId
  ? activity.participants.some((p: any) => p.userId === userId)
  : false;
```

Add `dynamic` import for MapPreview at the top of the file:

```typescript
import dynamic from 'next/dynamic';
const MapPreview = dynamic(() => import('@/components/map-preview'), { ssr: false });
```

Add a `SessionsSection` client component inline — add this **before** the `export default` function, at the bottom of the file:

```typescript
'use client' // Note: this goes at the top of a separate file; inline here we handle it via a client component import
```

Actually, since the page is a server component and we need client interactivity for the "Voy/No voy" buttons, add a separate client component for the sessions section. Add this to the same file is not possible since it's server-rendered. Instead, create the sessions section as a client component:

Create `src/app/activities/[id]/sessions-section.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MapPreview = dynamic(() => import('@/components/map-preview'), { ssr: false });

interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string | null;
  lat: number;
  lng: number;
}

interface SessionsSectionProps {
  activityId: string;
  sessions: Session[];
}

export default function SessionsSection({ activityId, sessions }: SessionsSectionProps) {
  const [statuses, setStatuses] = useState<Record<string, 'CONFIRMED' | 'DECLINED' | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    sessions.forEach((s) => {
      fetch(`/api/sessions/${s.id}/attendance`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setStatuses((prev) => ({ ...prev, [s.id]: data.status }));
          }
        })
        .catch(() => {});
    });
  }, [sessions]);

  async function setAttendance(sessionId: string, status: 'CONFIRMED' | 'DECLINED') {
    setLoading((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setStatuses((prev) => ({ ...prev, [sessionId]: status }));
      }
    } finally {
      setLoading((prev) => ({ ...prev, [sessionId]: false }));
    }
  }

  if (sessions.length === 0) {
    return (
      <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-heading text-2xl font-semibold mb-3">Próximas sesiones</h2>
        <p className="text-sm text-muted-foreground">No hay sesiones programadas aún.</p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <h2 className="font-heading text-2xl font-semibold">Próximas sesiones</h2>
      <ul className="space-y-4">
        {sessions.map((s) => {
          const status = statuses[s.id];
          const isLoading = loading[s.id];
          return (
            <li key={s.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {new Date(s.date).toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.startTime} – {s.endTime} (estimado)
                  </p>
                  {s.description && (
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setAttendance(s.id, 'CONFIRMED')}
                    disabled={isLoading}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      status === 'CONFIRMED'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    Voy
                  </button>
                  <button
                    onClick={() => setAttendance(s.id, 'DECLINED')}
                    disabled={isLoading}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      status === 'DECLINED'
                        ? 'bg-destructive text-destructive-foreground border-destructive'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    No voy
                  </button>
                </div>
              </div>
              <MapPreview lat={s.lat} lng={s.lng} height="h-36" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

Then in `src/app/activities/[id]/page.tsx`, import SessionsSection:

```typescript
import SessionsSection from './sessions-section';
```

And in the return JSX, after the admin participants section (or after the left column for non-admins), add:

```tsx
{isEnrolled && activity.sessions && (
  <SessionsSection
    activityId={activity.id}
    sessions={activity.sessions.map((s: any) => ({
      id: s.id,
      date: s.date.toISOString(),
      startTime: s.startTime,
      endTime: s.endTime,
      description: s.description,
      lat: s.lat,
      lng: s.lng,
    }))}
  />
)}
```

Place this block after the closing `</div>` of `max-w-5xl mx-auto` grid and before the closing `</main>`:

Replace the final part of the return:

```tsx
        {isAdmin && (
          <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
            {/* ... existing admin participants section ... */}
          </section>
        )}
      </div>

      {isEnrolled && activity.sessions && (
        <div className="max-w-5xl mx-auto px-4">
          <SessionsSection
            activityId={activity.id}
            sessions={activity.sessions.map((s: any) => ({
              id: s.id,
              date: s.date.toISOString(),
              startTime: s.startTime,
              endTime: s.endTime,
              description: s.description,
              lat: s.lat,
              lng: s.lng,
            }))}
          />
        </div>
      )}
    </main>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/activities/[id]/
git commit -m "feat: add sessions section for enrolled members on activity detail"
```

---

## Task 11: Navbar — PROFESSOR Support

**Files:**
- Modify: `src/components/navbar.tsx`

- [ ] **Step 1: Add PROFESSOR to navbar logic**

In `src/components/navbar.tsx`, the current logic is:

```typescript
const isMember = !!session && !isAdmin;
const activitiesHref = isMember ? '/my-activities' : '/activities';
```

Replace with:

```typescript
const isProfessor = role === 'PROFESSOR';
const isMember = !!session && !isAdmin && !isProfessor;
const activitiesHref = isMember || isProfessor ? '/my-activities' : '/activities';
```

The translation key `t.myActivities` is already defined for all languages in `src/lib/i18n.ts`, so no i18n changes are needed.

- [ ] **Step 2: Commit**

```bash
git add src/components/navbar.tsx
git commit -m "feat: route PROFESSOR role to /my-activities in navbar"
```

---

## Task 12: Final Build Verification

- [ ] **Step 1: Run full build**

```bash
npm run build 2>&1 | tail -30
```

Expected: compilation succeeds with no new TypeScript errors.

- [ ] **Step 2: Create feature branch and push**

```bash
git checkout -b feat/profesor-role
git push -u origin feat/profesor-role
```

- [ ] **Step 3: Open PR**

```bash
gh pr create \
  --title "feat: add Professor role with activity sessions and attendance" \
  --body "$(cat <<'EOF'
## Summary
- New PROFESSOR role in the system
- Admins can assign multiple professors to activities via the activity edit page
- Professors see their assigned activities at /my-activities with session management
- Each session has date, start/end time, description and an interactive map pin (React-Leaflet + OpenStreetMap)
- Enrolled members can confirm/decline attendance per session on the activity detail page

## Migration
Run `npx prisma migrate deploy` to apply `20260427000002_add_profesor_role`.

## Test plan
- [ ] Set a user's role to PROFESSOR from admin panel
- [ ] Assign that professor to an activity from the activity edit page
- [ ] Log in as professor — verify /my-activities shows assigned activities
- [ ] Create a session with map picker — verify it appears in the list
- [ ] Log in as enrolled member — verify sessions section appears on activity detail
- [ ] Confirm/decline attendance — verify toggle persists on refresh

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
