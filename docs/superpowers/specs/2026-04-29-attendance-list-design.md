# Expandible Attendance Lists for Activity Days

**Date:** 2026-04-29  
**Feature:** Interactive attendance indicators with expandible participant lists  
**Scope:** Activity days section (`/activities/[id]`)

---

## Overview

Currently, the "Días de la actividad" section shows a simple text indicator: `{goingCount} confirmados · {notGoingCount} no asistirán`. This design adds interactivity by making both indicators clickeable, each expanding to show a list of participants with their full names and profile links.

---

## Requirements

### Functional

1. **Clickeable indicators** — Both "X confirmados" and "X no asistirán" are buttons/links
2. **Independent expansion** — Each list (going, not going) can expand/collapse independently
3. **Participant list** — Shows:
   - Full name (firstName + lastName)
   - Link to parent/tutor profile (for children, link to userId of registerer; for adults, link to their own profile)
   - Clean, simple list format (no additional metadata)
4. **State persistence** — Expanded/collapsed state per day (survives re-renders but not navigation)
5. **Responsive** — Works on mobile and desktop

### Non-Functional

- Minimal component complexity (reuse existing patterns)
- No new API calls (data already available in ActivityDaysPanel)
- Accessible markup for screen readers

---

## Data Model

### Input to ActivityDaysPanel

Expand existing `ActivityDay` type to include participant data:

```typescript
type ParticipantForAttendance = {
  activityParticipantId: string;
  status: 'GOING' | 'NOT_GOING' | 'PENDING';
  participantName: string; // full name (firstName lastName)
  registeredUserId: string; // userId for profile link (parent if child, self if adult)
};

// Existing ActivityDay type gets new field:
attendanceList: ParticipantForAttendance[];
```

### Data Flow

1. Page (`/activities/[id]/page.tsx`) queries participants + attendances for each day
2. Transforms data into `attendanceList` array
3. Passes down to `ActivityDaysPanel`
4. Component uses this data to render lists

---

## UI Structure

### Current State
```
Días de la actividad
─────────────────────
[Day: 2026-05-10]
  viernes, 10 de mayo de 2026 · 10:00 - 12:00 · Parque Central
  2 confirmados · 1 no asistirá
  [Edit button]
  
  [Confirmation section with buttons...]
```

### New State (Collapsed)
```
[Day: 2026-05-10]
  viernes, 10 de mayo de 2026 · 10:00 - 12:00 · Parque Central
  [2 confirmados] · [1 no asistirá]  ← clickeable buttons
  [Edit button]
```

### New State (Expanded - both lists)
```
[Day: 2026-05-10]
  viernes, 10 de mayo de 2026 · 10:00 - 12:00 · Parque Central
  [2 confirmados ▼] · [1 no asistirá ▼]
  
  Confirmados
  ├─ Juan Pérez García → link
  ├─ María López Martínez → link
  
  No asistirán
  ├─ Carlos Rodríguez → link
  
  [Edit button]
```

---

## Implementation

### 1. Update ActivityDaysPanel Props

```typescript
type ParticipantForAttendance = {
  activityParticipantId: string;
  status: 'GOING' | 'NOT_GOING' | 'PENDING';
  participantName: string;
  registeredUserId: string;
};

type ActivityDay = {
  // ... existing fields ...
  attendanceList: ParticipantForAttendance[];
};
```

### 2. Component State

```typescript
// Track expanded/collapsed per day and per status
const [expandedLists, setExpandedLists] = useState<
  Record<string, { going: boolean; notGoing: boolean }>
>({});

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

### 3. Render Changes (lines 219-221)

Replace:
```tsx
<span>
  {goingCount} confirmados · {notGoingCount} no asistirán
</span>
```

With:
```tsx
<div className="flex gap-2 text-xs text-muted-foreground">
  <button
    onClick={() => toggleExpanded(day.id, 'going')}
    className="text-link hover:underline underline-offset-4 font-medium"
  >
    {goingCount} confirmados {expandedLists[day.id]?.going ? '▼' : '▶'}
  </button>
  <span>·</span>
  <button
    onClick={() => toggleExpanded(day.id, 'notGoing')}
    className="text-link hover:underline underline-offset-4 font-medium"
  >
    {notGoingCount} no asistirán {expandedLists[day.id]?.notGoing ? '▼' : '▶'}
  </button>
</div>
```

### 4. New AttendanceList Component

Create `src/app/activities/[id]/attendance-list.tsx`:

```typescript
import Link from 'next/link';

type ParticipantForAttendance = {
  activityParticipantId: string;
  status: 'GOING' | 'NOT_GOING' | 'PENDING';
  participantName: string;
  registeredUserId: string;
};

interface AttendanceListProps {
  label: string; // "Confirmados" or "No asistirán"
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

### 5. Render Lists (after attendance buttons section)

```tsx
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
```

### 6. Update Page Query (page.tsx)

In the `days` query, add attendance data fetch and transform:

```typescript
attendanceList: day.attendances.map((attendance) => {
  const participant = participants.find(
    (p) => p.id === attendance.activityParticipantId
  );
  return {
    activityParticipantId: attendance.activityParticipantId,
    status: attendance.status,
    participantName: participant
      ? getParticipantName(participant)
      : 'Unknown',
    registeredUserId: participant?.user.id || '',
  };
});
```

---

## Edge Cases

1. **No participants for a status** — List doesn't render (handled by length check)
2. **Participant name missing** — Falls back to "Unknown" (safe)
3. **User has no profile** — Link still works, 404 handled by app
4. **Long names** — Text wraps naturally, no truncation
5. **Mobile** — Buttons stack, full width, touch-friendly

---

## Testing

- Click "X confirmados" → list expands with correct participants
- Click again → list collapses
- Click "X no asistirán" independently → no effect on confirmados list
- Verify names and links are correct
- Test with 0, 1, 5+ participants
- Verify responsive layout on mobile

---

## Notes

- Profile link path assumes `/admin/users/[userId]` route exists
- Attendance list only shows GOING and NOT_GOING, not PENDING (PENDING are shown in confirmation section)
- Component is read-only; no mutation of attendance from this view
