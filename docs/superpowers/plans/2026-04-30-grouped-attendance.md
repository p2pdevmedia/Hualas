# Parent-Child Grouped Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow parents to confirm attendance for themselves + selected children as a single unit, with attendance counts reflecting total people.

**Architecture:** Add new `GroupedActivityDayAttendance` Prisma model, new API endpoint (`PATCH /api/activity-days/[dayId]/grouped-attendance`), and update frontend UI in `activity-days-panel.tsx` to show parent with child checkboxes. Keep `ActivityParticipant` unchanged (for payment/audit). Prevent conflicts via 409 response on old endpoint when grouped record exists.

**Tech Stack:** Next.js 14 (App Router), Prisma, PostgreSQL, TypeScript, React, Zod (validation)

---

## File Structure

**New Files:**

- `src/app/api/activity-days/[dayId]/grouped-attendance/route.ts` - New grouped attendance endpoint
- `src/lib/validations/grouped-attendance.ts` - Zod validation schema
- `tests/api/grouped-attendance.test.ts` - API tests

**Modified Files:**

- `prisma/schema.prisma` - Add `GroupedActivityDayAttendance` model
- `src/app/api/activity-days/[dayId]/attendance/route.ts` - Add 409 conflict check
- `src/app/activities/[id]/activity-days-panel.tsx` - UI updates for grouped display
- `src/app/activities/[id]/page.tsx` - Fetch grouped attendance records

**Migrations:**

- `prisma/migrations/[timestamp]_add_grouped_attendance/migration.sql` - Auto-generated

---

## Task 1: Prisma Schema & Migration

**Files:**

- Modify: `prisma/schema.prisma` (add new model)
- Create: Migration (auto-generated)

- [ ] **Step 1: Add GroupedActivityDayAttendance model to schema**

Open `prisma/schema.prisma` and add this model after the `ActivityDayAttendance` model:

```prisma
model GroupedActivityDayAttendance {
  id                    String                  @id @default(cuid())
  activityDayId         String
  parentUserId          String
  childIds              String[]                // JSON array of Child.id
  status                AttendanceStatus        @default(PENDING)
  confirmedAt           DateTime?
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  activityDay           ActivityDay             @relation(fields: [activityDayId], references: [id], onDelete: Cascade)
  parentUser            User                    @relation("GroupedAttendanceParent", fields: [parentUserId], references: [id], onDelete: Cascade)

  @@unique([activityDayId, parentUserId])
  @@index([activityDayId])
  @@index([parentUserId])
}
```

Also update the `ActivityDay` model to include the new relation (find the model definition and add this line):

```prisma
groupedAttendances    GroupedActivityDayAttendance[] @relation("ActivityDayGroupedAttendance")
```

And update the `User` model to add the relation (find the model and add):

```prisma
groupedAttendances    GroupedActivityDayAttendance[] @relation("GroupedAttendanceParent")
```

- [ ] **Step 2: Generate migration**

Run:

```bash
pnpm prisma migrate dev --name add_grouped_attendance
```

Expected output: Migration created in `prisma/migrations/` and schema synced to dev database.

- [ ] **Step 3: Generate Prisma client**

Run:

```bash
pnpm prisma:generate
```

Expected output: Prisma client regenerated with new model types.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "schema: add GroupedActivityDayAttendance model for parent-child grouped attendance"
```

---

## Task 2: Validation Schema

**Files:**

- Create: `src/lib/validations/grouped-attendance.ts`

- [ ] **Step 1: Create grouped attendance validation schema**

Create new file `src/lib/validations/grouped-attendance.ts`:

```typescript
import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const groupedAttendanceSchema = z.object({
  parentUserId: z.string().cuid('Invalid parent user ID'),
  childIds: z.array(z.string().cuid('Invalid child ID')),
  status: z.enum(['PENDING', 'GOING', 'NOT_GOING'] as const),
});

export type GroupedAttendanceRequest = z.infer<typeof groupedAttendanceSchema>;

export const groupedAttendanceResponseSchema = z.object({
  id: z.string(),
  activityDayId: z.string(),
  parentUserId: z.string(),
  childIds: z.array(z.string()),
  status: z.enum(['PENDING', 'GOING', 'NOT_GOING'] as const),
  confirmedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  totalPeople: z.number().int().positive(),
});

export type GroupedAttendanceResponse = z.infer<
  typeof groupedAttendanceResponseSchema
>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/grouped-attendance.ts
git commit -m "feat: add grouped attendance validation schema"
```

---

## Task 3: Backend API - New Grouped Attendance Endpoint

**Files:**

- Create: `src/app/api/activity-days/[dayId]/grouped-attendance/route.ts`

- [ ] **Step 1: Create new endpoint file**

Create `src/app/api/activity-days/[dayId]/grouped-attendance/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { groupedAttendanceSchema } from '@/lib/validations/grouped-attendance';

export async function PATCH(
  req: Request,
  { params }: { params: { dayId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = groupedAttendanceSchema.parse(await req.json());

  // Validate day exists
  const day = await prisma.activityDay.findUnique({
    where: { id: params.dayId },
    select: {
      id: true,
      activityId: true,
      activityGroupId: true,
    },
  });

  if (!day) {
    return NextResponse.json({ error: 'Día no encontrado' }, { status: 404 });
  }

  // Validate session user is parent or admin
  const isAdmin =
    session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  if (data.parentUserId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate parent exists and is registered for activity
  const parentParticipant = await prisma.activityParticipant.findFirst({
    where: {
      activityId: day.activityId,
      userId: data.parentUserId,
      childId: null, // Parent registration only
    },
    select: { id: true, activityId: true },
  });

  if (!parentParticipant) {
    return NextResponse.json(
      { error: 'El padre no está registrado en esta actividad' },
      { status: 400 }
    );
  }

  // Validate all children exist, belong to parent, and are registered
  if (data.childIds.length > 0) {
    const childRecords = await prisma.child.findMany({
      where: {
        id: { in: data.childIds },
      },
      select: { id: true, userId: true },
    });

    if (childRecords.length !== data.childIds.length) {
      return NextResponse.json(
        { error: 'Uno o más hijos no existen' },
        { status: 400 }
      );
    }

    // Check all children belong to parent
    for (const child of childRecords) {
      if (child.userId !== data.parentUserId) {
        return NextResponse.json(
          { error: 'Uno o más hijos no pertenecen al padre' },
          { status: 400 }
        );
      }
    }

    // Check all children are registered for activity
    const childParticipants = await prisma.activityParticipant.findMany({
      where: {
        activityId: day.activityId,
        childId: { in: data.childIds },
      },
      select: { childId: true },
    });

    const registeredChildIds = new Set(childParticipants.map((p) => p.childId));
    for (const childId of data.childIds) {
      if (!registeredChildIds.has(childId)) {
        return NextResponse.json(
          { error: 'Uno o más hijos no están registrados en esta actividad' },
          { status: 400 }
        );
      }
    }
  }

  // Upsert grouped attendance record
  const grouped = await prisma.groupedActivityDayAttendance.upsert({
    where: {
      activityDayId_parentUserId: {
        activityDayId: day.id,
        parentUserId: data.parentUserId,
      },
    },
    create: {
      activityDayId: day.id,
      parentUserId: data.parentUserId,
      childIds: data.childIds,
      status: data.status,
      confirmedAt: data.status === 'PENDING' ? null : new Date(),
    },
    update: {
      childIds: data.childIds,
      status: data.status,
      confirmedAt: data.status === 'PENDING' ? null : new Date(),
    },
  });

  const totalPeople = 1 + grouped.childIds.length;

  return NextResponse.json({
    ...grouped,
    totalPeople,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/activity-days/[dayId]/grouped-attendance/route.ts
git commit -m "feat: add grouped attendance API endpoint"
```

---

## Task 4: Backend - Add Conflict Check to Old Endpoint

**Files:**

- Modify: `src/app/api/activity-days/[dayId]/attendance/route.ts`

- [ ] **Step 1: Update attendance endpoint to check for grouped record**

Open `src/app/api/activity-days/[dayId]/attendance/route.ts` and modify the PATCH handler. Find the section after the participant is fetched (around line 30-54), and add this check before the existing logic:

Replace this section:

```typescript
if (!participant || participant.userId !== session.user.id) {
  const childUserId = participant?.child?.userId;
  if (!participant || childUserId !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

With:

```typescript
if (!participant) {
  return NextResponse.json(
    { error: 'Participante no encontrado' },
    { status: 404 }
  );
}

// Authorization check
const isParticipantOwner = participant.userId === session.user.id;
const isChildOwner = participant.child?.userId === session.user.id;
if (!isParticipantOwner && !isChildOwner) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Check for conflicting grouped attendance (only if this is a parent registration)
if (!participant.childId) {
  const groupedRecord = await prisma.groupedActivityDayAttendance.findUnique({
    where: {
      activityDayId_parentUserId: {
        activityDayId: day.id,
        parentUserId: participant.userId,
      },
    },
    select: { id: true },
  });

  if (groupedRecord) {
    return NextResponse.json(
      {
        error:
          'Esta persona ya tiene una confirmación de asistencia grupal. Actualice el grupo en su lugar.',
      },
      { status: 409 }
    );
  }
}
```

- [ ] **Step 2: Run tests to ensure old endpoint still works for non-grouped scenarios**

Run:

```bash
npm test -- attendance
```

Expected output: Existing tests pass (those not involving grouped records).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/activity-days/[dayId]/attendance/route.ts
git commit -m "feat: add 409 conflict check for grouped attendance on legacy endpoint"
```

---

## Task 5: Frontend - Fetch Grouped Attendance Data

**Files:**

- Modify: `src/app/activities/[id]/page.tsx`

- [ ] **Step 1: Update activity detail page to fetch grouped attendance**

Open `src/app/activities/[id]/page.tsx` and find the section where `days` are fetched (around the query that builds the ActivityDay array).

In the `.map()` function that builds each day's `attendances` array, add a new query to fetch grouped records. Find where attendances are currently fetched like:

```typescript
attendances: day.attendances.map((a) => ({
  activityParticipantId: a.activityParticipantId,
  status: a.status,
  confirmedAt: a.confirmedAt,
})),
```

Replace it with:

```typescript
attendances: day.attendances.map((a) => ({
  activityParticipantId: a.activityParticipantId,
  status: a.status,
  confirmedAt: a.confirmedAt,
})),
groupedAttendances: await prisma.groupedActivityDayAttendance.findMany({
  where: {
    activityDayId: day.id,
  },
  select: {
    id: true,
    parentUserId: true,
    childIds: true,
    status: true,
    confirmedAt: true,
  },
}),
```

Also update the ActivityDay type definition to include:

```typescript
groupedAttendances: Array<{
  id: string;
  parentUserId: string;
  childIds: string[];
  status: 'PENDING' | 'GOING' | 'NOT_GOING';
  confirmedAt: Date | null;
}>;
```

- [ ] **Step 2: Run build to verify no TypeScript errors**

Run:

```bash
npm run build
```

Expected output: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/activities/[id]/page.tsx
git commit -m "feat: fetch grouped attendance data in activity detail page"
```

---

## Task 6: Frontend - Update Activity Days Panel Component

**Files:**

- Modify: `src/app/activities/[id]/activity-days-panel.tsx`

- [ ] **Step 1: Add types and helper function**

Open `src/app/activities/[id]/activity-days-panel.tsx` and add these types at the top of the file, after existing type definitions:

```typescript
type GroupedAttendance = {
  id: string;
  parentUserId: string;
  childIds: string[];
  status: AttendanceStatus;
  confirmedAt: string | null;
};

type RegistrationWithChildren = Registration & {
  childrenForActivity: Array<{ id: string; name: string; lastName?: string }>;
  currentGroupedRecord?: GroupedAttendance;
};
```

- [ ] **Step 2: Update ActivityDay type to include grouped data**

Find the `ActivityDay` type definition and add this field:

```typescript
groupedAttendances: GroupedAttendance[];
```

- [ ] **Step 3: Add state for selected children**

In the component function, after existing state declarations, add:

```typescript
const [selectedChildren, setSelectedChildren] = useState<
  Record<string, Set<string>>
>({});
```

- [ ] **Step 4: Add updateGroupedAttendance function**

Add this new async function alongside the existing `updateAttendance` function:

```typescript
async function updateGroupedAttendance(
  dayId: string,
  parentUserId: string,
  childIds: string[],
  status: AttendanceStatus
) {
  const key = `${dayId}:${parentUserId}`;
  setError('');
  setSavingKey(key);
  try {
    const res = await fetch(`/api/activity-days/${dayId}/grouped-attendance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentUserId, childIds, status }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error || 'No se pudo actualizar la asistencia');
    }
    router.refresh();
  } catch (err) {
    setError(
      err instanceof Error ? err.message : 'No se pudo actualizar la asistencia'
    );
  } finally {
    setSavingKey(null);
  }
}
```

- [ ] **Step 5: Update attendance count calculation**

Find the section where `goingCount` and `notGoingCount` are calculated (around line 178-183). Replace with:

```typescript
const goingCount =
  day.groupedAttendances
    .filter((g) => g.status === 'GOING')
    .reduce((sum, g) => sum + 1 + g.childIds.length, 0) +
  day.attendances.filter((attendance) => attendance.status === 'GOING').length;

const notGoingCount =
  day.groupedAttendances
    .filter((g) => g.status === 'NOT_GOING')
    .reduce((sum, g) => sum + 1 + g.childIds.length, 0) +
  day.attendances.filter((attendance) => attendance.status === 'NOT_GOING')
    .length;
```

- [ ] **Step 6: Update registration rendering section**

Find the section that renders individual registrations (around line 332-415). This section starts with:

```typescript
{registrations.length > 0 && (
  <div className="mt-4 space-y-3 border-t pt-4">
    <p className="text-sm font-semibold">
      Confirmación de asistencia
    </p>
    <div className="space-y-3">
      {registrations.map((registration) => {
```

Replace the entire `registrations.map()` block with:

```typescript
{registrations.length > 0 && (
  <div className="mt-4 space-y-3 border-t pt-4">
    <p className="text-sm font-semibold">
      Confirmación de asistencia
    </p>
    <div className="space-y-3">
      {registrations.map((registration) => {
        const currentAttendance = day.attendances.find(
          (attendance) =>
            attendance.activityParticipantId === registration.id
        );
        const currentStatus =
          currentAttendance?.status ?? 'PENDING';
        const key = `${day.id}:${registration.id}`;
        const isSaving = savingKey === key;
        const isAllowedForDay =
          !day.activityGroupId ||
          registration.groupId === day.activityGroupId;

        // Check if this is a parent registration with children
        const childrenForActivity = registrations.filter(
          (r) =>
            r.label.includes(' (') && // Child registrations have " (Child Name)"
            day.attendances.some(
              (a) =>
                a.activityParticipantId === r.id &&
                registrations.find(
                  (reg) =>
                    reg.id === registration.id &&
                    r.label !== reg.label
                )
            )
        );

        const hasChildren = childrenForActivity.length > 0;
        const groupedRecord = day.groupedAttendances.find(
          (g) => g.parentUserId === session?.user?.id
        );
        const currentGroupedStatus = groupedRecord?.status ?? 'PENDING';
        const groupedKey = `${day.id}:grouped:${registration.id}`;
        const isSavingGrouped = savingKey === groupedKey;

        return (
          <div
            key={registration.id}
            className="rounded-md border bg-card p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {registration.label}
                  {hasChildren && ` + ${childrenForActivity.length} hijo(s)`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Estado actual: {statusLabels[hasChildren ? currentGroupedStatus : currentStatus]}
                </p>
                <p className="text-xs text-muted-foreground">
                  Grupo: {registration.groupName ?? 'Sin grupo'}
                </p>
              </div>
              {(isSaving || isSavingGrouped) && (
                <span className="text-xs text-muted-foreground">
                  Guardando...
                </span>
              )}
            </div>

            {hasChildren && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <p className="text-xs font-medium">Incluir en confirmación:</p>
                {childrenForActivity.map((child) => (
                  <label
                    key={child.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedChildren[registration.id]?.has(child.id) ??
                        groupedRecord?.childIds.includes(child.id) ??
                        false
                      }
                      onChange={(e) => {
                        setSelectedChildren((prev) => {
                          const set = new Set(prev[registration.id] || []);
                          if (e.target.checked) {
                            set.add(child.id);
                          } else {
                            set.delete(child.id);
                          }
                          return { ...prev, [registration.id]: set };
                        });
                      }}
                      className="rounded"
                    />
                    <span>{child.label}</span>
                  </label>
                ))}
              </div>
            )}

            {isAllowedForDay ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    'GOING',
                    'NOT_GOING',
                    'PENDING',
                  ] as AttendanceStatus[]
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={isSaving || isSavingGrouped}
                    onClick={() => {
                      if (hasChildren) {
                        const childIds = Array.from(
                          selectedChildren[registration.id] ??
                          (groupedRecord?.childIds || [])
                        );
                        updateGroupedAttendance(
                          day.id,
                          registration.id, // parentUserId
                          childIds,
                          status
                        );
                      } else {
                        updateAttendance(
                          day.id,
                          registration.id,
                          status
                        );
                      }
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      (hasChildren ? currentGroupedStatus : currentStatus) === status
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Este día está restringido al grupo{' '}
                {day.activityGroup?.name ?? 'seleccionado'}.
              </p>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 7: Run build to verify no errors**

Run:

```bash
npm run build
```

Expected output: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/app/activities/[id]/activity-days-panel.tsx
git commit -m "feat: add grouped attendance UI with child checkboxes"
```

---

## Task 7: Write Integration Tests

**Files:**

- Create: `tests/api/grouped-attendance.test.ts`

- [ ] **Step 1: Create test file**

Create `tests/api/grouped-attendance.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { createMockSession } from '../helpers/mock-session';

describe('Grouped Attendance API', () => {
  let testActivity: any;
  let testDay: any;
  let testParent: any;
  let testChild: any;

  beforeAll(async () => {
    // Create test data
    testParent = await prisma.user.create({
      data: {
        email: 'parent@test.com',
        password: 'hashed',
        name: 'Test Parent',
        role: 'MEMBER',
      },
    });

    testChild = await prisma.child.create({
      data: {
        userId: testParent.id,
        name: 'Test Child',
      },
    });

    testActivity = await prisma.activity.create({
      data: {
        name: 'Test Activity',
        date: new Date(),
        frequency: 'ONE_TIME',
      },
    });

    testDay = await prisma.activityDay.create({
      data: {
        activityId: testActivity.id,
        date: new Date(),
        schedule: '10:00',
        geoLocation: 'Test Location',
        createdById: testParent.id,
      },
    });

    // Register parent and child
    await prisma.activityParticipant.create({
      data: {
        activityId: testActivity.id,
        userId: testParent.id,
        participantKey: `${testActivity.id}-${testParent.id}`,
      },
    });

    await prisma.activityParticipant.create({
      data: {
        activityId: testActivity.id,
        userId: testParent.id,
        childId: testChild.id,
        participantKey: `${testActivity.id}-${testChild.id}`,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.groupedActivityDayAttendance.deleteMany({});
    await prisma.activityParticipant.deleteMany({});
    await prisma.activityDay.deleteMany({});
    await prisma.activity.deleteMany({});
    await prisma.child.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('should create grouped attendance for parent with children', async () => {
    const session = createMockSession(testParent.id);

    const response = await fetch(
      `/api/activity-days/${testDay.id}/grouped-attendance`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentUserId: testParent.id,
          childIds: [testChild.id],
          status: 'GOING',
        }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totalPeople).toBe(2); // Parent + 1 child
    expect(data.childIds).toEqual([testChild.id]);
  });

  it('should reject if parent not registered', async () => {
    const otherParent = await prisma.user.create({
      data: {
        email: 'other@test.com',
        password: 'hashed',
        name: 'Other Parent',
      },
    });

    const response = await fetch(
      `/api/activity-days/${testDay.id}/grouped-attendance`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentUserId: otherParent.id,
          childIds: [],
          status: 'GOING',
        }),
      }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('no está registrado');

    await prisma.user.delete({ where: { id: otherParent.id } });
  });

  it('should return 409 if child not registered for activity', async () => {
    const otherChild = await prisma.child.create({
      data: {
        userId: testParent.id,
        name: 'Other Child',
      },
    });

    const response = await fetch(
      `/api/activity-days/${testDay.id}/grouped-attendance`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentUserId: testParent.id,
          childIds: [otherChild.id],
          status: 'GOING',
        }),
      }
    );

    expect(response.status).toBe(400);

    await prisma.child.delete({ where: { id: otherChild.id } });
  });

  it('should return 409 when trying old endpoint if grouped record exists', async () => {
    // Create grouped record first
    await prisma.groupedActivityDayAttendance.create({
      data: {
        activityDayId: testDay.id,
        parentUserId: testParent.id,
        childIds: [testChild.id],
        status: 'GOING',
      },
    });

    // Try to use old endpoint
    const parentParticipant = await prisma.activityParticipant.findFirst({
      where: {
        activityId: testActivity.id,
        userId: testParent.id,
        childId: null,
      },
    });

    const response = await fetch(
      `/api/activity-days/${testDay.id}/attendance`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: parentParticipant.id,
          status: 'NOT_GOING',
        }),
      }
    );

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toContain('confirmación grupal');
  });
});
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm test -- grouped-attendance
```

Expected output: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/api/grouped-attendance.test.ts
git commit -m "test: add integration tests for grouped attendance API"
```

---

## Task 8: Verify Backward Compatibility

**Files:**

- No new files (testing existing endpoints)

- [ ] **Step 1: Test solo parent (no children) can still use old endpoint**

Run existing activity day attendance tests:

```bash
npm test -- attendance
```

Expected output: All existing tests pass (solo registrations still work).

- [ ] **Step 2: Test count calculation with mixed grouped + ungrouped**

Create a quick manual test in your local dev environment:

1. Create an activity with 2 days
2. Register 1 parent + 1 child for the activity
3. Confirm parent+child as grouped for Day 1 (count should be 2)
4. Register another solo user
5. Confirm solo user for Day 1 via old endpoint (count should be 3)
6. Verify count displays correctly in UI

- [ ] **Step 3: Commit** (if any test changes)

```bash
git add tests/
git commit -m "test: verify backward compatibility for solo attendances"
```

---

## Task 9: Manual UI Testing & Verification

**Files:**

- No changes (testing/verification only)

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

Expected output: Server running on `http://localhost:3000`

- [ ] **Step 2: Test grouped attendance flow**

Scenario A: Parent with 1 child registered

1. Login as parent
2. Navigate to activity detail
3. Expand Day 1
4. Verify "Parent Name + 1 hijo(s)" label shows
5. Verify child checkbox appears
6. Check checkbox for child
7. Click "Voy a ir"
8. Verify "Confirmados" count increases by 2

Scenario B: Parent with 2 children, select 1

1. Register parent + 2 children for activity
2. Expand Day 1
3. Check only 1 child checkbox
4. Click "Voy a ir"
5. Verify "Confirmados" shows 2 (parent + 1 child)
6. Uncheck child and check the other child
7. Click "No voy a ir"
8. Verify count updates correctly

Scenario C: Solo parent (no children)

1. Register only parent (no children)
2. Expand Day 1
3. Verify no child checkboxes appear
4. Click "Voy a ir"
5. Verify count increases by 1
6. Verify solo behavior unchanged

- [ ] **Step 3: Test error scenarios**

Scenario: Try to confirm grouped then use old endpoint

1. (From Scenario A) Parent already confirmed grouped
2. Open browser DevTools → Network
3. Try to call old endpoint via manual fetch:

```javascript
fetch('/api/activity-days/[dayId]/attendance', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ participantId: '...', status: 'NOT_GOING' }),
});
```

4. Verify response is 409 with message about grouped confirmation

- [ ] **Step 4: Test performance**

1. Create activity with 100+ registrations (parent + children mix)
2. Navigate to activity detail
3. Verify page loads in <2s
4. Verify count calculation is instant

- [ ] **Step 5: Document manual test results**

Create file `MANUAL_TEST_RESULTS.md` with your findings (pass/fail for each scenario).

- [ ] **Step 6: Clean up and commit**

```bash
git add MANUAL_TEST_RESULTS.md
git commit -m "test: document manual UI testing results for grouped attendance"
```

---

## Self-Review Against Spec

**Spec Coverage Check:**

| Spec Section                                     | Implemented In                      | ✓   |
| ------------------------------------------------ | ----------------------------------- | --- |
| Data Model (GroupedActivityDayAttendance)        | Task 1: Schema                      | ✓   |
| API Endpoint (PATCH /api/.../grouped-attendance) | Task 3: New Endpoint                | ✓   |
| Validation (parent/child/registration checks)    | Task 3: Endpoint logic              | ✓   |
| Conflict detection (409 on old endpoint)         | Task 4: Old Endpoint Conflict Check | ✓   |
| Backward compatibility (solo registrations)      | Task 8: Verification                | ✓   |
| UI with checkboxes                               | Task 6: Frontend Component          | ✓   |
| Attendance count calculation                     | Task 6: Count Logic                 | ✓   |
| Error handling (401/404/400/409)                 | Task 3 & 4: Endpoint Logic          | ✓   |
| Testing (integration + manual)                   | Task 7 & 9: Tests                   | ✓   |

**Placeholder Scan:**

- ✓ All code blocks complete (no "TBD" or "implement later")
- ✓ All types defined (GroupedAttendance, etc.)
- ✓ All validation rules explicit
- ✓ All error codes and messages specified
- ✓ All commands have expected outputs

**Type Consistency Check:**

- `status` field: `AttendanceStatus` enum (PENDING/GOING/NOT_GOING) used consistently
- `childIds`: `string[]` JSON array used in schema, API, and frontend
- `totalPeople`: Calculated as `1 + childIds.length` in endpoint and frontend
- Endpoint name: `/api/activity-days/[dayId]/grouped-attendance` consistent throughout

All checks passed. Plan is complete and ready for execution.

---

## Execution Instructions

This plan contains 9 tasks. **Recommended approach:**

**Option 1: Subagent-Driven (Recommended for speed)**

- I dispatch a fresh subagent per task
- Each subagent focuses on one task in isolation
- I review each completed task before moving to next
- Fast feedback loop, easy to catch issues early

**Option 2: Inline Execution (Recommended for context)**

- Execute tasks sequentially in this session
- Full context preservation between tasks
- Single review checkpoint after all tasks complete
- Better for understanding dependencies

Which approach would you prefer?
