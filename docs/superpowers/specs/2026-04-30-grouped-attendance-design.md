# Parent-Child Grouped Attendance Design

**Date:** 2026-04-30  
**Feature:** Allow parents to confirm attendance for themselves and selected children as a single unit  
**Status:** Design Approved

---

## Problem Statement

Currently, when a parent and their child are both registered for the same activity, they have separate attendance records. When the parent clicks "Voy a ir" or "No voy a ir," only the parent's attendance updates—the system doesn't automatically count the child's attendance or provide a way to confirm both at once.

**User Goal:** When a parent with registered children updates attendance, they should be able to confirm for themselves + selected children in one action, with the count reflecting all people being confirmed.

---

## Solution Overview

Introduce a new `GroupedActivityDayAttendance` model that represents a parent + selected children as a single attendance unit. The parent confirms once, selecting which of their registered children to include, and the system counts them as multiple people in attendance totals.

---

## Data Model

### New Model: GroupedActivityDayAttendance

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
  parentUser            User                    @relation(fields: [parentUserId], references: [id], onDelete: Cascade)
  
  @@unique([activityDayId, parentUserId])
  @@index([activityDayId])
  @@index([parentUserId])
}
```

**Fields:**
- `parentUserId`: The parent (User) confirming attendance
- `childIds`: Array of Child IDs included in this confirmation (stored as JSON)
- `status`: Attendance status (`PENDING`, `GOING`, `NOT_GOING`)
- `confirmedAt`: Timestamp when status was set to non-PENDING

**Relationships:**
- One parent per activity day (unique constraint)
- Cascade delete on activity day removal

### Unchanged Models

- `ActivityParticipant`: Remains unchanged. Parent + child registrations are still separate records (for payment, capacity, and audit purposes).
- `ActivityDayAttendance`: Deprecated for grouped scenarios; marked as legacy.

---

## API Specification

### New Endpoint: Grouped Attendance Update

**Endpoint:** `PATCH /api/activity-days/[dayId]/grouped-attendance`

**Request Body:**
```json
{
  "parentUserId": "user123",
  "childIds": ["child1", "child2"],
  "status": "GOING"
}
```

**Response (Success 200):**
```json
{
  "id": "grouped123",
  "activityDayId": "day456",
  "parentUserId": "user123",
  "childIds": ["child1", "child2"],
  "status": "GOING",
  "confirmedAt": "2026-04-30T14:22:00Z",
  "totalPeople": 3
}
```

**Validation:**
1. Session user must be the parent or an admin
2. Parent must be registered as `ActivityParticipant` for the activity
3. All children must be registered as `ActivityParticipant` for the same activity
4. All children must belong to the parent (`Child.userId === parentUserId`)
5. Activity day must exist and belong to a valid activity

**Error Responses:**
- `401 Unauthorized`: User is not the parent or admin
- `404 Not Found`: Activity day not found
- `400 Bad Request`: Parent or child not registered, child doesn't belong to parent, or invalid payload
- `409 Conflict`: If a grouped record already exists for this parent on this day, update it instead of failing

### Existing Endpoint: Individual Attendance Update

**Endpoint:** `PATCH /api/activity-days/[dayId]/attendance` (unchanged URL, modified behavior)

**Behavior Change:**
- If a `GroupedActivityDayAttendance` record exists for the parent, return `409 Conflict` with message: "Esta persona ya tiene una confirmación de asistencia grupal. Actualice el grupo en su lugar."
- Solo registrations (no grouped record) continue to work as before

---

## Frontend Implementation

### Component: Activity Days Panel

**File:** `src/app/activities/[id]/activity-days-panel.tsx`

**Data Fetching:**
1. Fetch all registrations for the logged-in user (parents + their children)
2. For each activity day, fetch:
   - All `GroupedActivityDayAttendance` records (to show grouped confirmations)
   - All `ActivityDayAttendance` records (for backward compatibility, solo registrations)

**Registration Display Logic:**

For each parent registration:
1. Check if they have children also registered for this activity
2. If yes, fetch their grouped attendance record for this day
3. Render grouped card with:
   - Parent name
   - Child list with checkboxes (pre-checked if in current grouped record)
   - Status buttons (Voy, No voy, Pendiente)
4. If no children, render as single-person registration (existing behavior)

**UI Layout per Parent Registration:**
```
┌─────────────────────────────────────┐
│ Parent Name                         │
│ Estado actual: Voy / No voy / ...   │
│ Grupo: Sin grupo                    │
│                                     │
│ ☐ Child 1 Name                      │
│ ☐ Child 2 Name                      │
│                                     │
│ [Voy a ir] [No voy a ir] [Pendiente]│
└─────────────────────────────────────┘
```

**onClick Handler Update:**
- Call new endpoint: `PATCH /api/activity-days/[dayId]/grouped-attendance`
- Pass `parentUserId`, selected `childIds`, and `status`
- If no children selected, call old endpoint for solo registration

**Attendance Count Update:**
```typescript
const goingCount = 
  groupedAttendances
    .filter(g => g.status === 'GOING')
    .reduce((sum, g) => sum + 1 + g.childIds.length, 0)
  + 
  ungroupedAttendances
    .filter(a => a.status === 'GOING').length
```

---

## Error Handling

### Conflict Scenarios

| Scenario | Handling |
|----------|----------|
| Parent tries old endpoint while grouped record exists | Return 409: "Ya tiene confirmación grupal" |
| Child unregistered after grouped record created | Query validation fails; frontend refresh prompts update |
| Multiple tabs/sessions updating simultaneously | Last write wins (upsert behavior) |
| Parent removed from activity | Query validation fails on next update |
| Admin removes child from activity | Grouped record becomes stale; next sync removes child from array |

### Validation Flow

```
Request received
  ↓
Check session user is parent or admin
  ↓
Validate parent registered for activity
  ↓
For each child in childIds:
  - Validate child exists
  - Validate child belongs to parent
  - Validate child registered for activity
  ↓
Upsert GroupedActivityDayAttendance
  ↓
Return 200 with totalPeople count
```

---

## Backward Compatibility

1. **Old `ActivityDayAttendance` records remain.**
   - Existing solo registrations continue to work
   - Individual endpoints still work for non-grouped scenarios

2. **Grouped records take precedence:**
   - If a parent has a grouped record, individual updates are blocked (409)
   - If grouped record is deleted, individual attendance falls back to old system

3. **Display Logic:**
   - Fetch both types of records; display unified view
   - Counting logic sums both sources

---

## Testing Strategy

### Unit Tests
- Validate parent-child relationship checks
- Validate activity registration checks
- Test upsert logic (create vs. update)
- Test conflict detection

### Integration Tests
- Test grouped attendance creation flow end-to-end
- Test attendance count calculations
- Test switching between grouped and solo (if grouped record deleted)
- Test concurrent updates (last write wins)

### Manual Testing
- Parent with 1 child: confirm for both, verify count = 2
- Parent with 2 children: select only 1, confirm, verify count = 2
- Parent with 2 children: uncheck one, update, verify count changes
- Solo parent (no children registered): verify solo button behavior unchanged
- Conflict scenario: create grouped, then try old endpoint, verify 409
- Admin scenario: admin can update any parent's grouped attendance

---

## Rollout Plan

1. **Deploy schema migration** (creates new table)
2. **Deploy backend API** (new endpoint, conflict detection on old endpoint)
3. **Deploy frontend** (new UI with grouped cards)
4. **Monitor:** Track grouped attendance usage, error rates, and count accuracy
5. **Cleanup (future):** Once all activity days are migrated away from old `ActivityDayAttendance`, deprecate old endpoint

---

## Open Questions / Future Work

- Should admins see a different view (e.g., forced grouped mode)?
- Should we auto-migrate old `ActivityDayAttendance` records to grouped when child records exist?
- Should a "select all children" checkbox be added for convenience?
- Should grouped records be visible in reports with explicit parent/child breakdown?

---

## Success Criteria

✓ Parent can confirm attendance for themselves + selected children in one action  
✓ Attendance count reflects total people (parent + children)  
✓ UI clearly shows which children are included  
✓ Conflicts are prevented (no accidental dual-confirmation)  
✓ Backward compatibility maintained for solo registrations  
✓ No impact on payment/registration audit trail  
