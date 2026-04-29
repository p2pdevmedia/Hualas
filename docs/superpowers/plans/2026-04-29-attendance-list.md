# Expandible Attendance Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive, expandible attendance lists to activity days that show full participant names with profile links.

**Architecture:** Create a new `AttendanceList` component to display participant lists. Update `ActivityDaysPanel` to manage expand/collapse state and render lists. Modify the page query to transform attendance data into the required format. Replace static text indicators with clickable buttons.

**Tech Stack:** React, Next.js, TypeScript, Zod validation, Prisma ORM

---

## File Structure

**Files to create:**
- `src/app/activities/[id]/attendance-list.tsx` — Presentational component for rendering participant lists

**Files to modify:**
- `src/app/activities/[id]/activity-days-panel.tsx` — Add state management, update UI, integrate AttendanceList
- `src/app/activities/[id]/page.tsx` — Transform data, pass attendanceList to component

---

## Implementation Tasks

### Task 1: Create AttendanceList Component

**Files:**
- Create: `src/app/activities/[id]/attendance-list.tsx`

- [ ] **Step 1: Create new AttendanceList component file**

Create `src/app/activities/[id]/attendance-list.tsx`:

```typescript
import Link from 'next/link';

export type ParticipantForAttendance = {
  activityParticipantId: string;
  status: 'GOING' | 'NOT_GOING' | 'PENDING';
  participantName: string;
  registeredUserId: string;
};

interface AttendanceListProps {
  label: string;
  participants: ParticipantForAttendance[];
  isExpanded: boolean;
}

export default function AttendanceList({
  label,
  participants,
  isExpanded,
}: AttendanceListProps) {
  if (!isExpanded || participants.length === 0) return null;

  return (
    <div className="mt-3 rounded-md bg-muted/30 p-3">
      <p className="mb-2 text-xs font-semibold text-foreground">{label}</p>
      <ul className="space-y-1">
        {participants.map((participant) => (
          <li key={participant.activityParticipantId} className="text-xs">
            <Link
              href={`/admin/users/${participant.registeredUserId}`}
              className="text-link hover:underline underline-offset-2"
            >
              {participant.participantName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verify file is created**

Run: `ls -la src/app/activities/[id]/attendance-list.tsx`
Expected: File exists

---

### Task 2: Update ActivityDaysPanel Types

**Files:**
- Modify: `src/app/activities/[id]/activity-days-panel.tsx:1-60`

- [ ] **Step 1: Read the current ActivityDay type definition**

The current type is defined around line 29-49. You need to add `attendanceList` field.

- [ ] **Step 2: Update ActivityDay type to include attendanceList**

Find this section (lines 29-49):
```typescript
type ActivityDay = {
  id: string;
  date: string;
  schedule: string;
  description: string | null;
  geoLocation: string;
  latitude: number | null;
  longitude: number | null;
  activityGroupId: string | null;
  activityGroup: {
    id: string;
    name: string;
  } | null;
  assignedProfessors: ProfessorOption[];
  canEdit: boolean;
  attendances: Array<{
    activityParticipantId: string;
    status: AttendanceStatus;
    confirmedAt: string | null;
  }>;
};
```

Replace with:
```typescript
type ParticipantForAttendance = {
  activityParticipantId: string;
  status: AttendanceStatus;
  participantName: string;
  registeredUserId: string;
};

type ActivityDay = {
  id: string;
  date: string;
  schedule: string;
  description: string | null;
  geoLocation: string;
  latitude: number | null;
  longitude: number | null;
  activityGroupId: string | null;
  activityGroup: {
    id: string;
    name: string;
  } | null;
  assignedProfessors: ProfessorOption[];
  canEdit: boolean;
  attendances: Array<{
    activityParticipantId: string;
    status: AttendanceStatus;
    confirmedAt: string | null;
  }>;
  attendanceList: ParticipantForAttendance[];
};
```

- [ ] **Step 3: Add import for AttendanceList component**

At the top of the file (after existing imports), add:
```typescript
import AttendanceList, {
  type ParticipantForAttendance,
} from './attendance-list';
```

---

### Task 3: Add Expand/Collapse State to ActivityDaysPanel

**Files:**
- Modify: `src/app/activities/[id]/activity-days-panel.tsx:76-81`

- [ ] **Step 1: Add expandedLists state**

Find the current state declarations (around line 76-80):
```typescript
const [showCreateForm, setShowCreateForm] = useState(false);
const [editingDayId, setEditingDayId] = useState<string | null>(null);
const [error, setError] = useState('');
const [savingKey, setSavingKey] = useState<string | null>(null);
```

Add this after them:
```typescript
const [expandedLists, setExpandedLists] = useState<
  Record<string, { going: boolean; notGoing: boolean }>
>({});
```

- [ ] **Step 2: Add toggleExpanded helper function**

Add this function after the `updateAttendance` function (after line 112):

```typescript
function toggleExpanded(dayId: string, status: 'going' | 'notGoing') {
  setExpandedLists((prev) => ({
    ...prev,
    [dayId]: {
      ...prev[dayId],
      [status]: !prev[dayId]?.[status],
    },
  }));
}
```

---

### Task 4: Replace Static Indicator with Clickable Buttons

**Files:**
- Modify: `src/app/activities/[id]/activity-days-panel.tsx:218-222`

- [ ] **Step 1: Find the current attendance indicator**

Around line 218-222, you'll find:
```typescript
<div className="flex flex-col items-start gap-2 text-xs text-muted-foreground sm:items-end">
  <span>
    {goingCount} confirmados · {notGoingCount} no asistirán
  </span>
```

- [ ] **Step 2: Replace with clickable buttons**

Replace the `<span>` element with:
```typescript
<div className="flex gap-2 text-xs text-muted-foreground">
  <button
    type="button"
    onClick={() => toggleExpanded(day.id, 'going')}
    className="text-link hover:underline underline-offset-4 font-medium transition-colors"
  >
    {goingCount} confirmados {expandedLists[day.id]?.going ? '▼' : '▶'}
  </button>
  <span>·</span>
  <button
    type="button"
    onClick={() => toggleExpanded(day.id, 'notGoing')}
    className="text-link hover:underline underline-offset-4 font-medium transition-colors"
  >
    {notGoingCount} no asistirán {expandedLists[day.id]?.notGoing ? '▼' : '▶'}
  </button>
</div>
```

---

### Task 5: Render AttendanceList Components

**Files:**
- Modify: `src/app/activities/[id]/activity-days-panel.tsx:273-275` (after edit form section)

- [ ] **Step 1: Find insertion point**

After the edit form section (after line 272-273), before the registrations section (line 275), add the attendance lists.

- [ ] **Step 2: Add attendance list renders**

Insert this code after the `{isEditing && ...}` block and before `{registrations.length > 0 && ...}`:

```typescript
{(expandedLists[day.id]?.going || expandedLists[day.id]?.notGoing) && (
  <div className="mt-4 space-y-3 border-t pt-4">
    {expandedLists[day.id]?.going && (
      <AttendanceList
        label="Confirmados"
        participants={day.attendanceList.filter((a) => a.status === 'GOING')}
        isExpanded={true}
      />
    )}
    {expandedLists[day.id]?.notGoing && (
      <AttendanceList
        label="No asistirán"
        participants={day.attendanceList.filter((a) => a.status === 'NOT_GOING')}
        isExpanded={true}
      />
    )}
  </div>
)}
```

---

### Task 6: Update Page Query to Include Attendance Data

**Files:**
- Modify: `src/app/activities/[id]/page.tsx:163-198`

- [ ] **Step 1: Find the days query**

Around line 163-198, you'll find the `prisma.activityDay.findMany()` query.

- [ ] **Step 2: Verify attendances are included**

The query already includes `attendances` in the select. Verify lines 186-192 contain:
```typescript
attendances: {
  select: {
    activityParticipantId: true,
    status: true,
    confirmedAt: true,
  },
},
```

This is good — no changes needed here.

- [ ] **Step 3: Create transformation function at top of page component**

Add this helper function inside `ActivityPage` component after the `getParticipantSubtitle` function (after line 46):

```typescript
function transformAttendanceList(
  day: typeof days[number],
  participantsMap: Map<string, ActivityParticipantDetail>
) {
  return day.attendances.map((attendance) => {
    const participant = participantsMap.get(attendance.activityParticipantId);
    return {
      activityParticipantId: attendance.activityParticipantId,
      status: attendance.status,
      participantName: participant
        ? getParticipantName(participant)
        : 'Unknown',
      registeredUserId: participant?.user.id || '',
    };
  });
}
```

- [ ] **Step 4: Build participants map and transform days data**

After the `Promise.all()` block (after line 199), add:

```typescript
// Create a map of participants for quick lookup
const participantsMap = new Map(participants.map((p) => [p.id, p]));

// Transform days data to include attendanceList
const daysWithAttendance = days.map((day) => ({
  ...day,
  attendanceList: transformAttendanceList(day, participantsMap),
}));
```

- [ ] **Step 5: Update ActivityDaysPanel call to use transformed data**

Find where `ActivityDaysPanel` is rendered (search for `<ActivityDaysPanel`), and change:
```typescript
days={days}
```

to:
```typescript
days={daysWithAttendance}
```

---

### Task 7: Verify Types Are Exported Correctly

**Files:**
- Modify: `src/app/activities/[id]/activity-days-panel.tsx` (top section)

- [ ] **Step 1: Check ActivityDaysPanel exports**

Ensure `ParticipantForAttendance` is exported or the component has a clear interface. The component should work with the types defined.

- [ ] **Step 2: Verify no type mismatches**

Ensure that:
- `attendance.status` matches `AttendanceStatus` enum: `'GOING' | 'NOT_GOING' | 'PENDING'`
- `registeredUserId` is always a string
- `participantName` is always a string

---

### Task 8: Build and Test

**Files:**
- Test: Full feature testing

- [ ] **Step 1: Run TypeScript check**

Run: `npm run build`
Expected: No TypeScript errors, build succeeds

- [ ] **Step 2: Start dev server**

Run: `npm run dev`
Expected: Server starts on http://localhost:3000

- [ ] **Step 3: Navigate to an activity with days**

Go to: `http://localhost:3000/activities/[activity-id]`
(Replace `[activity-id]` with a real activity ID from the database)

- [ ] **Step 4: Test clicking "confirmados" indicator**

Action: Click on "X confirmados" button
Expected: List expands showing participants with full names and profile links

- [ ] **Step 5: Test clicking "no asistirán" indicator**

Action: Click on "X no asistirán" button
Expected: List expands showing participants with full names and profile links

- [ ] **Step 6: Test independent expansion**

Action: Click "confirmados" to expand, then click "no asistirán" without closing first
Expected: Both lists are visible independently

- [ ] **Step 7: Test collapse**

Action: Click "confirmados" button again
Expected: List collapses, arrow changes back to ▶

- [ ] **Step 8: Test profile links**

Action: Click on a participant name in either list
Expected: Navigate to `/admin/users/[userId]` profile page

- [ ] **Step 9: Verify responsive behavior**

Action: Test on mobile viewport
Expected: Buttons stack properly, text wraps, links are touch-friendly

---

### Task 9: Commit Changes

**Files:**
- Modified: `src/app/activities/[id]/page.tsx`
- Modified: `src/app/activities/[id]/activity-days-panel.tsx`
- Created: `src/app/activities/[id]/attendance-list.tsx`

- [ ] **Step 1: Stage all files**

Run:
```bash
git add src/app/activities/[id]/page.tsx \
         src/app/activities/[id]/activity-days-panel.tsx \
         src/app/activities/[id]/attendance-list.tsx
```

- [ ] **Step 2: Create commit**

Run:
```bash
git commit -m "feat: add expandible attendance lists to activity days

- Create AttendanceList component for rendering participant lists
- Add clickable indicators in ActivityDaysPanel (confirmados/no asistirán)
- Transform attendance data to include participant names and profile links
- Support independent expansion of going/not-going lists

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

Expected: Commit succeeds

---

## Verification Checklist

- [ ] TypeScript build passes (`npm run build`)
- [ ] Dev server starts without errors
- [ ] Indicators are clickable buttons with arrow indicators (▶/▼)
- [ ] Lists expand/collapse on click
- [ ] Going and not-going lists expand independently
- [ ] Participant names are full names (firstName lastName)
- [ ] Profile links point to `/admin/users/[userId]`
- [ ] Responsive on mobile viewport
- [ ] No console errors in browser DevTools
- [ ] Attendance section still works below expanded lists

---

## Notes

- The `ParticipantForAttendance` type is defined in both `attendance-list.tsx` and imported in `activity-days-panel.tsx`
- Profile link assumes `/admin/users/[userId]` route exists; if different, update line in `attendance-list.tsx:22`
- Only GOING and NOT_GOING statuses are shown in expandible lists; PENDING participants remain in the "Confirmación de asistencia" section
- Collapse state is per-day and per-status, so each day can have independent going/notGoing states
