# Profesor Role — Design Spec

**Date:** 2026-04-27  
**Branch:** feat/profesor-role  
**Status:** Approved

---

## Overview

Add a `PROFESSOR` role to the system. Admins can assign multiple professors to activities. Professors manage weekly sessions for their activities. Enrolled members confirm or decline attendance per session.

---

## 1. Database

### 1.1 Role enum

Add `PROFESSOR` to the existing `Role` enum in `prisma/schema.prisma`.

### 1.2 ActivityProfessor (new table)

Many-to-many join between `Activity` and `User` (professors).

| Field      | Type     | Notes                                |
| ---------- | -------- | ------------------------------------ |
| id         | String   | cuid, PK                             |
| activityId | String   | FK → Activity                        |
| userId     | String   | FK → User (must have role PROFESSOR) |
| createdAt  | DateTime | default now()                        |

Unique constraint: `(activityId, userId)`.

### 1.3 ActivitySession (new table)

A session is one occurrence of an activity, defined by a professor.

| Field       | Type     | Notes                                |
| ----------- | -------- | ------------------------------------ |
| id          | String   | cuid, PK                             |
| activityId  | String   | FK → Activity                        |
| createdById | String   | FK → User (professor who created it) |
| date        | DateTime | Date of the session                  |
| startTime   | String   | "HH:MM" (local time)                 |
| endTime     | String   | "HH:MM" estimated                    |
| description | String?  | Optional notes                       |
| lat         | Float    | Latitude of meeting point            |
| lng         | Float    | Longitude of meeting point           |
| createdAt   | DateTime | default now()                        |

### 1.4 SessionAttendance (new table)

Per-participant attendance confirmation for each session.

| Field         | Type             | Notes                    |
| ------------- | ---------------- | ------------------------ |
| id            | String           | cuid, PK                 |
| sessionId     | String           | FK → ActivitySession     |
| participantId | String           | FK → ActivityParticipant |
| status        | AttendanceStatus | CONFIRMED \| DECLINED    |
| updatedAt     | DateTime         | updatedAt                |

Unique constraint: `(sessionId, participantId)`.

### 1.5 New enum

```prisma
enum AttendanceStatus {
  CONFIRMED
  DECLINED
}
```

---

## 2. API Routes

### Admin — Professor assignment

| Method | Path                                       | Description                    |
| ------ | ------------------------------------------ | ------------------------------ |
| GET    | `/api/activities/[id]/professors`          | List assigned professors       |
| POST   | `/api/activities/[id]/professors`          | Assign a professor (by userId) |
| DELETE | `/api/activities/[id]/professors/[userId]` | Remove a professor             |

Auth: ADMIN or SUPER_ADMIN only.

### Professor — Session management

| Method | Path                            | Description                   |
| ------ | ------------------------------- | ----------------------------- |
| GET    | `/api/activities/[id]/sessions` | List sessions for an activity |
| POST   | `/api/activities/[id]/sessions` | Create a new session          |

Auth (POST): must be PROFESSOR and assigned to the activity.

### Member — Attendance

| Method | Path                            | Description                                   |
| ------ | ------------------------------- | --------------------------------------------- |
| PATCH  | `/api/sessions/[id]/attendance` | Set attendance status (CONFIRMED or DECLINED) |

Auth: must be enrolled in the activity (have an ActivityParticipant record).

---

## 3. Frontend Routes

### `/my-activities` (new)

- Visible only to users with role `PROFESSOR`.
- Shows a card per assigned activity (same data as the public activity card).
- Each card expands to show: list of created sessions (date, time, description, small map pin), and a "Nueva sesión" button.

### `/my-activities/[id]/sessions/new` (new)

- Professor-only form to create a session.
- Fields: date (date picker), start time, end time, description (textarea).
- Interactive map: React-Leaflet + OpenStreetMap tiles. Click on map to place pin (sets lat/lng). Pin is draggable.
- Submit → POST `/api/activities/[id]/sessions`.

### `/activities/[id]` (modified)

- New section "Próximas sesiones" below the activity description.
- Only visible to enrolled members (have an ActivityParticipant for this activity).
- Each session row shows: date, time range, description, mini-map with pin.
- "Voy" / "No voy" toggle buttons. State is persisted via PATCH `/api/sessions/[id]/attendance`.

### `/activities/[id]/edit` (modified)

- New "Profesores" panel at the bottom of the edit form.
- Lists currently assigned professors with a "Quitar" button each.
- Autocomplete/select to find users with role `PROFESSOR` and assign them.

### Navbar (modified)

- PROFESSOR role sees a "Mis actividades" link (alongside existing "Perfil").
- MEMBER and ADMIN see no change.

---

## 4. Map Implementation

- Library: `react-leaflet` + `leaflet` (no API key required, OpenStreetMap tiles).
- Map picker component: `src/components/map-picker.tsx` — renders a map, click places a draggable marker, emits `{ lat, lng }` to parent.
- Mini-map display component: `src/components/map-preview.tsx` — read-only map centered on a pin, used in session cards.
- Both components are `'use client'` with dynamic import (`next/dynamic`, `ssr: false`) to avoid SSR issues with Leaflet.

---

## 5. Affected Files Summary

### New files

- `prisma/migrations/YYYYMMDD_add_profesor_role/migration.sql`
- `src/app/my-activities/page.tsx`
- `src/app/my-activities/[id]/sessions/new/page.tsx`
- `src/app/my-activities/[id]/sessions/new/form.tsx`
- `src/app/api/activities/[id]/professors/route.ts`
- `src/app/api/activities/[id]/professors/[userId]/route.ts`
- `src/app/api/activities/[id]/sessions/route.ts`
- `src/app/api/sessions/[id]/attendance/route.ts`
- `src/components/map-picker.tsx`
- `src/components/map-preview.tsx`

### Modified files

- `prisma/schema.prisma` — add PROFESSOR role, 3 new models, 1 new enum
- `src/app/activities/[id]/page.tsx` — add sessions section for enrolled members
- `src/app/activities/[id]/edit/form.tsx` — add professors panel
- `src/components/navbar.tsx` (or equivalent) — add "Mis actividades" link for PROFESSOR
- `src/lib/auth.ts` — ensure PROFESSOR is handled in session/type

---

## 6. Out of Scope

- Professors editing or deleting sessions (only creation in v1).
- Admin view of attendance per session.
- Push notifications for new sessions.
- Attendance history / statistics.
