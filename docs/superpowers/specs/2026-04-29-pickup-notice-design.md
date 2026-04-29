# Pickup Notice System Design

**Date:** 2026-04-29  
**Feature:** Allow parents to alert teachers when a child will be picked up by someone other than their usual guardian.

---

## Overview

Parents can create a "pickup notice" for their child linked to a specific activity day. Teachers assigned to that day can see the notice, confirm receipt, and add notes. The system supports both registered users and free-text names for the alternate pickup person.

---

## Requirements

### Functional

1. **Parent creates notice**
   - Only the parent/guardian (User linked to the Child) can create a notice
   - Notice is for one child, one activity day
   - Alternate pickup person: either select a registered User OR enter free text name
   - Required: description of who is picking up
   - Can be created anytime before the activity day

2. **Professor views notices**
   - Only professors assigned to that specific activity day can see the notices
   - Notices appear in activity day detail view
   - Shows: child name, alternate person, description, creation date

3. **Professor acknowledges**
   - Professor can click "Confirm" to acknowledge receipt
   - Professor can add optional notes when confirming
   - Parent sees who has confirmed

4. **Parent edits/deletes**
   - Parent can edit notice anytime before the activity day
   - Parent can delete notice anytime before the activity day
   - After activity day, notice becomes read-only

---

## Data Model

### PickupNotice

```prisma
model PickupNotice {
  id                    String   @id @default(cuid())
  activityDay           ActivityDay @relation(fields: [activityDayId], references: [id], onDelete: Cascade)
  activityDayId         String
  child                 Child @relation(fields: [childId], references: [id], onDelete: Cascade)
  childId               String
  createdBy             User @relation("PickupNoticeCreator", fields: [createdById], references: [id], onDelete: Restrict)
  createdById           String
  
  // Alternate person: either a registered user or free text
  alternatePersonUser   User? @relation("PickupNoticeAlternatePerson", fields: [alternatePersonUserId], references: [id], onDelete: SetNull)
  alternatePersonUserId String?
  alternatePersonName   String? // Free text if not a registered user
  
  description           String // Why/what they're here for
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime? // Soft delete
  
  // Acknowledgments from professors
  acknowledgments       PickupNoticeAcknowledgment[]
  
  @@unique([activityDayId, childId])
  @@index([childId])
  @@index([createdById])
  @@index([activityDayId])
}

model PickupNoticeAcknowledgment {
  id              String   @id @default(cuid())
  pickupNotice    PickupNotice @relation(fields: [pickupNoticeId], references: [id], onDelete: Cascade)
  pickupNoticeId  String
  acknowledgedBy  User @relation(fields: [acknowledgedById], references: [id], onDelete: Restrict)
  acknowledgedById String
  notes           String?
  confirmedAt     DateTime @default(now())
  
  @@unique([pickupNoticeId, acknowledgedById])
  @@index([pickupNoticeId])
  @@index([acknowledgedById])
}
```

### Relationships

- `PickupNotice.createdBy` → the parent creating the notice
- `PickupNotice.child` → the child being picked up
- `PickupNotice.activityDay` → the day the notice applies to
- `PickupNotice.alternatePersonUser` → if the pickup person is a registered user
- `PickupNotice.acknowledgments` → professor confirmations

---

## API Endpoints

### Create Notice

```
POST /api/activity-days/[dayId]/pickup-notices
```

**Request body:**
```json
{
  "childId": "child_123",
  "alternatePersonUserId": null,
  "alternatePersonName": "Tía María",
  "description": "Mi hermana vendrá a buscar a Juan después de clase"
}
```

**Response:** `201 Created`
```json
{
  "id": "notice_123",
  "activityDayId": "day_456",
  "childId": "child_123",
  "createdById": "user_789",
  "alternatePersonUserId": null,
  "alternatePersonName": "Tía María",
  "description": "Mi hermana vendrá a buscar a Juan después de clase",
  "createdAt": "2026-04-29T10:00:00Z",
  "acknowledgments": []
}
```

**Validation:**
- `childId` must belong to the creating parent
- `activityDayId` must be in the future
- Either `alternatePersonUserId` or `alternatePersonName` must be provided
- Duplicate notice for same child+day not allowed

---

### List Notices for Activity Day

```
GET /api/activity-days/[dayId]/pickup-notices
```

**Response:** `200 OK`
```json
[
  {
    "id": "notice_123",
    "activityDayId": "day_456",
    "childId": "child_123",
    "child": { "id": "child_123", "name": "Juan", "parentName": "Parent Name" },
    "alternatePersonName": "Tía María",
    "description": "Mi hermana vendrá a buscar a Juan",
    "createdAt": "2026-04-29T10:00:00Z",
    "createdBy": { "id": "user_789", "name": "Parent Name" },
    "acknowledgments": [
      {
        "id": "ack_111",
        "acknowledgedBy": { "id": "prof_222", "name": "Prof. García" },
        "notes": "Conforme, anotado",
        "confirmedAt": "2026-04-29T11:00:00Z"
      }
    ]
  }
]
```

**Access:** Only professors assigned to this activity day via `ActivityDayProfessor`

---

### Update Notice

```
PUT /api/pickup-notices/[noticeId]
```

**Request body:**
```json
{
  "alternatePersonName": "Tía María García",
  "description": "Updated description"
}
```

**Response:** `200 OK` (updated notice)

**Validation:**
- Only the creating parent can edit
- Cannot edit if activity day has passed

---

### Delete Notice

```
DELETE /api/pickup-notices/[noticeId]
```

**Response:** `204 No Content`

**Validation:**
- Only the creating parent can delete
- Cannot delete if activity day has passed
- Soft delete: set `deletedAt` timestamp

---

### Acknowledge Notice

```
POST /api/pickup-notices/[noticeId]/acknowledgments
```

**Request body:**
```json
{
  "notes": "Conforme, he anotado"
}
```

**Response:** `201 Created`
```json
{
  "id": "ack_111",
  "pickupNoticeId": "notice_123",
  "acknowledgedById": "prof_222",
  "confirmedAt": "2026-04-29T11:00:00Z",
  "notes": "Conforme, he anotado"
}
```

**Validation:**
- Only professors assigned to this activity day can acknowledge
- One acknowledgment per professor per notice

---

## UI Components

### Parent: Create/Edit Notice

**Location:** Child profile or activity day details (member view)

- Form with:
  - Child selector (dropdown: their children)
  - Alternate person selector:
    - Dropdown: "Select from contacts" (registered users)
    - OR text field: "Enter name/description"
  - Description textarea (required, e.g., "Tía María, my sister, will pick up")
  - Save/Cancel buttons
  - Success toast on save

**Edit flow:**
- Parent opens notice
- Can modify fields (except child and day)
- Changes saved via PUT

**Delete:**
- Delete button with confirmation dialog

---

### Professor: View Notices

**Location:** Activity day detail page (professor view)

- Section: "Pickup Notices for [Activity Day]"
- List of notices with:
  - Child name and parent name
  - Alternate person (name or user)
  - Description
  - "Confirm receipt" button (if not yet acknowledged by this professor)
  - List of professor acknowledgments below (names + timestamps + notes)
  - Acknowledgments are read-only

**Empty state:** "No pickup notices for this day"

---

## Error Handling

| Scenario | Status | Message |
|----------|--------|---------|
| Parent tries to edit past day | 400 Bad Request | "Cannot modify notices after activity day" |
| Parent tries to create for someone else's child | 403 Forbidden | "Cannot create notice for this child" |
| Professor not assigned to day | 403 Forbidden | "You do not have access to this activity day" |
| Duplicate notice (same child, day) | 400 Bad Request | "A notice already exists for this child on this day" |
| Invalid child/day | 404 Not Found | "Resource not found" |

---

## Permissions & Authorization

| Action | Allowed Roles | Condition |
|--------|---------------|-----------|
| Create notice | User (any) | Must be parent of the child; activityDay must be future |
| Edit notice | User (any) | Must be creator; activityDay must be future |
| Delete notice | User (any) | Must be creator; activityDay must be future |
| View notices | PROFESSOR, ADMIN | Must be assigned to this activityDay via ActivityDayProfessor |
| Acknowledge | PROFESSOR, ADMIN | Must be assigned to this activityDay |

---

## Testing

### Unit Tests
- Validate creation rules (parent owns child, day is future)
- Validate unique constraint (one per child per day)
- Validate past-day edit restrictions

### Integration Tests
- Parent creates, edits, deletes notice
- Professor sees notices only for assigned days
- Professor acknowledges and adds notes
- Soft delete works correctly

### E2E Tests
- Parent flow: create → view acknowledgments
- Professor flow: view notice → confirm → see acknowledgment

---

## Implementation Order

1. Prisma migration: add `PickupNotice` and `PickupNoticeAcknowledgment` tables
2. API endpoints: CRUD for notices + acknowledgment
3. Parent UI: notice form in activity/child context
4. Professor UI: notice list in activity day view
5. Tests: unit + integration
6. E2E verification

---

## Open Questions / Risks

**None at this stage.** All requirements are clear.

---

## Scope

This feature **only** adds the pickup notice system. It does **not** include:
- General notification/alert system (only visual display in activity day)
- Email/SMS to professors (parents see acknowledgments in UI)
- Recurring notices (one per day)
- Bulk notices (one child at a time)
