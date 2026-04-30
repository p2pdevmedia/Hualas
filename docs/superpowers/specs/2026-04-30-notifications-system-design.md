# Notifications System Design

**Date:** 2026-04-30
**Feature:** Real-time notifications system with in-app inbox and Web Push delivery for browser and PWA. Notifies users about activity day changes, pickup notices, payments, capacity, and chat messages, filtered by role and per-user preferences.

---

## Overview

Hualas users (members, professors, accountants, admins) need to find out about events that affect them — a new day on an activity they joined, a pickup notice on a day they teach, a payment that was approved, a chat message, an activity that just hit its capacity. Today the only channel is opening the app and looking around.

This system adds two complementary channels:

1. **In-app inbox** — a bell icon in the navbar with an unread counter and a dropdown panel showing the user's notifications. Always available; no permissions needed.
2. **Web Push** — operating system level notifications delivered via the W3C Web Push standard. Works on desktop browsers (Chrome, Edge, Firefox, Safari) and on mobile when the user installs the web app as a PWA.

Both channels are driven by the same set of events. Each event has a defined recipient set and a notification type that the user can toggle on/off in their preferences page.

---

## Requirements

### Functional

1. **Event coverage (v1)**
   - Activity day created → notify all registered participants of that activity
   - Activity day updated (date / schedule / location only) → notify all registered participants
   - Pickup notice created → notify professors of that activity day (fallback: professors of the activity) + alternate person if it's a registered User
   - Pickup notice acknowledged by a professor → notify the parent who created it
   - Manual accounting movement created → notify users with role `COUNTER`, `ADMIN`, `SUPER_ADMIN`
   - Mercado Pago payment approved → notify the User who paid
   - Mercado Pago payment rejected → notify the User who paid
   - Activity capacity reached → notify users with role `ADMIN`, `SUPER_ADMIN` (only once per activity, on the transition from `< capacity` to `>= capacity`)
   - New chat message → notify the recipient, but only one notification per sender until the recipient reads the conversation

2. **Per-user preferences**
   - Each notification type has two toggles per user: "Show in app" and "Send push"
   - Defaults to `true` for both when no preference row exists (no preference rows are precreated)
   - Preferences page at `/profile/notifications`
   - Page filters the list of types by the roles that can receive each type (parents don't see `PAYMENT_MANUAL_CREATED`; professors don't see `ACTIVITY_CAPACITY_FULL`; etc.)

3. **In-app inbox**
   - Bell icon in the navbar for authenticated users with unread count badge
   - Dropdown panel showing latest 10 notifications (unread first, then read)
   - Each item: type icon, title, body, relative time, optional internal link
   - Click on an item marks it as read and navigates to the link
   - "Mark all as read" action
   - Polling every 60 seconds for unread count
   - Service worker `postMessage` triggers an immediate refresh when a push arrives with the tab open

4. **Web Push subscription**
   - Mini-modal explains why the user should enable push, then triggers the native permission prompt
   - Modal appears once per user on first authenticated visit when `Notification.permission === 'default'`
   - "Not now" stores `pushPromptDismissedAt` in `localStorage` and suppresses the modal for 7 days
   - "Enable" calls `Notification.requestPermission()` then `pushManager.subscribe()` and POSTs the subscription to the server
   - On iOS, the modal warns that the user must add the app to the home screen first
   - One user can have multiple subscriptions (one per browser/device); preferences page lists them with a "Disable" action per device

5. **Delivery semantics**
   - All triggers are fire-and-forget: the API response does not wait for notifications
   - In-app rows are created in a single `createMany` per event for efficiency
   - Pushes are sent in parallel with `Promise.allSettled`; failures are logged, do not affect the original action
   - Subscriptions returning HTTP 404 or 410 are marked with `failedAt` and skipped on subsequent sends

### Non-functional

- No external services or paid dependencies. Web Push uses self-managed VAPID keys and the standard `web-push` npm library.
- No background workers or queues. The architecture leaves room to add an outbox + cron later if scale demands it, but v1 is synchronous-with-best-effort.
- Spanish user-facing text following Argentine conventions, English code and identifiers.

---

## Data Model

Three new Prisma models, one new enum. No changes to existing tables beyond adding inverse relations on `User`.

```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  body      String
  url       String?
  data      Json?
  readAt    DateTime?
  createdAt DateTime         @default(now())

  @@index([userId, readAt, createdAt])
  @@index([type, createdAt])
}

model PushSubscription {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint   String    @unique
  p256dh     String
  auth       String
  userAgent  String?
  createdAt  DateTime  @default(now())
  lastUsedAt DateTime  @default(now())
  failedAt   DateTime?

  @@index([userId])
}

model NotificationPreference {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  inApp     Boolean          @default(true)
  push      Boolean          @default(true)
  updatedAt DateTime         @updatedAt

  @@unique([userId, type])
}

enum NotificationType {
  ACTIVITY_DAY_NEW
  ACTIVITY_DAY_UPDATED
  PICKUP_NOTICE_CREATED
  PICKUP_NOTICE_ACKNOWLEDGED
  PAYMENT_MANUAL_CREATED
  PAYMENT_APPROVED
  PAYMENT_REJECTED
  ACTIVITY_CAPACITY_FULL
  CHAT_MESSAGE_NEW
}
```

Inverse relations added to `User`: `notifications`, `pushSubscriptions`, `notificationPreferences`.

### Design decisions

- **`Notification` is always created** when `inApp` preference is `true`, regardless of whether the user has any push subscription. Push delivery is independent and best-effort.
- **Preference defaults are `true` and not precreated.** Querying defaults to `{inApp: true, push: true}` when no row exists. Rows only exist for users who toggled something off.
- **`endpoint` is globally unique.** If a user logs in on a new browser, that browser produces a different endpoint and a separate row. If two users share the same browser (rare), `upsert` by `endpoint` reassigns the `userId`.
- **Push payload is built per-send from the `Notification` row** — only endpoint and crypto keys are persisted in `PushSubscription`.

---

## Architecture

### Backend layout

```
src/lib/notifications/
├── notification-service.ts   # public API: one function per event
├── dispatcher.ts             # creates Notification rows + dispatches push (internal)
├── push-sender.ts            # wrapper around web-push library
├── preferences.ts            # resolves inApp/push per user, defaulting to true
└── recipients.ts             # resolves recipient userIds per event type
```

### `notification-service.ts` — public API

The only file consumed by API routes. One function per event:

```ts
export async function notifyActivityDayCreated(dayId: string): Promise<void>
export async function notifyActivityDayUpdated(dayId: string): Promise<void>
export async function notifyPickupNoticeCreated(noticeId: string): Promise<void>
export async function notifyPickupNoticeAcknowledged(ackId: string): Promise<void>
export async function notifyPaymentManualCreated(movementId: string): Promise<void>
export async function notifyPaymentApproved(paymentId: string): Promise<void>
export async function notifyPaymentRejected(paymentId: string): Promise<void>
export async function notifyActivityCapacityFull(activityId: string): Promise<void>
export async function notifyChatMessage(messageId: string): Promise<void>
```

Each function: (1) loads the data it needs from Prisma, (2) calls `recipients.ts` for the userId list, (3) calls the dispatcher with a fully-formed payload (`type`, `title`, `body`, `url`, `data`, `recipients`).

### Trigger pattern

After the DB commit and before the response, fire-and-forget:

```ts
const day = await prisma.activityDay.create({ ... });

notifyActivityDayCreated(day.id).catch((err) => {
  console.error('[notifications] activityDayCreated failed', err);
});

return NextResponse.json(day);
```

The HTTP response does not wait for notifications. Errors are logged but never bubble up to the user-facing operation.

### `dispatcher.ts` — internal

Receives `{ type, recipients: string[], title, body, url?, data? }`. Steps:

1. Resolves preferences for all recipients in one query (`IN (userIds)`).
2. Filters out users with both `inApp = false` and `push = false`.
3. **Type-specific debounce filter**: for `CHAT_MESSAGE_NEW`, removes any recipient that already has an unread `Notification` of this type with the same `data.senderId` and `data.conversationId`. Other types skip this step.
4. Inserts all remaining `Notification` rows in a single `createMany` (only for users with `inApp = true`).
5. Loads `PushSubscription` rows for users with `push = true`, excluding rows with `failedAt`.
6. Sends push to all subscriptions in parallel with `Promise.allSettled`.
7. For rejected pushes with HTTP 404 or 410, marks the corresponding `PushSubscription` with `failedAt`. Other failures are logged but the row stays valid.

### `push-sender.ts`

Thin wrapper over the `web-push` npm library. Reads `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` from env. Exposes `sendPush(subscription, payload)` returning a promise. Throws with the HTTP status when the push server rejects.

### `recipients.ts`

One function per event with a focused query:

- `recipientsForActivityDay(dayId)` → all `userId` of `ActivityParticipant` of the day's activity. If a participant is registered for a child, returns the parent's `userId`. Deduplicates.
- `recipientsForPickupNotice(noticeId)` → professors of the `ActivityDayProfessor` for that day; falls back to `ActivityProfessor` of the activity if the day has none. Adds `alternatePersonUserId` if not null. Deduplicates.
- `recipientsForPickupNoticeAcknowledged(ackId)` → the `createdById` of the related `PickupNotice`.
- `recipientsForManualMovement()` → all users with role `COUNTER`, `ADMIN`, `SUPER_ADMIN`.
- `recipientsForPayment(paymentId)` → resolves both payment paths in the system: (a) for the `Payment` model in the orders flow, returns `Order.responsibleUserId`; (b) for activity participant payments triggered by `MercadoPagoNotification`, returns `ActivityParticipant.userId` of the resulting participant. The notification service decides which path to use based on the trigger source.
- `recipientsForCapacityFull()` → all users with role `ADMIN`, `SUPER_ADMIN`.
- `recipientsForChatMessage(messageId)` → all conversation participants except the sender. The chat-debounce check is applied inside the dispatcher path for this type.

### `preferences.ts`

`resolvePreferences(userIds: string[], type: NotificationType): Promise<Map<string, {inApp: boolean, push: boolean}>>` — returns a map with `{inApp: true, push: true}` for any userId not present in `NotificationPreference`.

---

## Web Push delivery

### Service worker

`public/sw.js` (plain file, served from root, scope `/`):

- Listens to `push` event, parses JSON payload, calls `self.registration.showNotification(title, { body, data: { url }, icon: '/favicon.ico' })`.
- Listens to `notificationclick`: closes the notification, opens or focuses the URL from `data.url` (defaults to `/`).
- Posts a `message` to all open clients on `push` so the bell can refresh immediately.

### Subscription flow

`push-manager.tsx` mounts in the authenticated layout (not on public pages):

1. Detects support: `'serviceWorker' in navigator && 'PushManager' in window`.
2. Registers `/sw.js`.
3. Checks current state: `Notification.permission` and `pushManager.getSubscription()`.
4. If permission is `default` and `pushPromptDismissedAt` in localStorage is older than 7 days (or absent), shows `push-permission-modal`.
5. If the user clicks "Enable" and permission is granted, calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })` and POSTs the subscription JSON to `/api/notifications/subscriptions`.
6. If the user is already subscribed in the browser but the server has no record, runs the same POST (idempotent, `upsert` by endpoint).
7. On logout, leaves the subscription in place (will be reassigned by `upsert` on next login from the same browser, if the next user is different).

### iOS handling

Detects `/iPhone|iPad/.test(navigator.userAgent) && !navigator.standalone` and shows an extra paragraph in the modal: "En iPhone, primero agregá la app a tu pantalla de inicio". Permission prompt is still shown — Safari handles the gating natively.

### Environment variables

Documented in `README.md`:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — exposed to client, used in `applicationServerKey`
- `VAPID_PRIVATE_KEY` — server only
- `VAPID_SUBJECT` — `mailto:` or `https://` URL identifying the operator

Generated once with `npx web-push generate-vapid-keys`. Never committed.

---

## Frontend components

```
src/components/notifications/
├── notification-bell.tsx
├── notification-panel.tsx
├── notification-item.tsx
├── push-permission-modal.tsx
└── push-manager.tsx

src/app/profile/notifications/
├── page.tsx
└── preferences-form.tsx
```

### `notification-bell.tsx`

- Mounted in `src/components/navbar.tsx` for authenticated users.
- Polls `/api/notifications?unread=1&limit=10` every 60 seconds.
- Listens to `navigator.serviceWorker` `message` events to refresh on incoming push.
- Renders the bell icon with a numeric badge (no badge if zero unread).

### `notification-panel.tsx`

- Dropdown opened from the bell.
- Latest 10 notifications, unread first then read.
- Each item: icon by type, title, body, "hace X min/h/días" relative time (using existing i18n helpers), navigates to `url` on click and PATCHes `/api/notifications/:id` to mark read.
- Footer link "Preferencias de notificaciones" → `/profile/notifications`.
- "Marcar todas como leídas" button → PATCH `/api/notifications` (no id).

### `push-permission-modal.tsx`

- Shown by `push-manager.tsx`.
- Two buttons: "Activar" (calls `Notification.requestPermission()`) and "Ahora no" (sets localStorage flag, closes).
- If permission is `denied` after the prompt, shows a toast: "Podés activarlas más tarde desde Preferencias".
- If permission becomes `granted`, the manager continues the subscribe flow.

### `/profile/notifications` page

Three sections:

1. **Tipos de notificación** — one row per `NotificationType` applicable to the user's role (filtered by a static `NotificationTypeRolesMap`). Two toggles per row: "Mostrar en la app" and "Notificarme con push". Changes PUT immediately to `/api/notifications/preferences`.
2. **Dispositivos suscriptos** — list of the user's `PushSubscription` rows, parsing `userAgent` into a friendly label. "Desactivar" button per row → DELETE `/api/notifications/subscriptions/:id`.
3. **Estado del navegador actual** — banner showing whether browser permission is `default`, `granted`, or `denied`. Includes a button "Activar en este navegador" for `default`, instructions for `denied`.

---

## API endpoints

All require authenticated session. Validation in `src/lib/validations/notifications.ts` using `zod`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/notifications/subscriptions` | Upsert subscription by endpoint |
| DELETE | `/api/notifications/subscriptions/:id` | Remove a subscription (verifies ownership) |
| GET | `/api/notifications` | List user's notifications, paginated; `?unread=1` filter |
| PATCH | `/api/notifications/:id` | Mark single notification as read |
| PATCH | `/api/notifications` | Mark all as read |
| GET | `/api/notifications/preferences` | Map of `{type → {inApp, push}}`, defaulting to `true` |
| PUT | `/api/notifications/preferences` | Upsert one preference row by `(userId, type)` |

---

## Trigger map

| # | Event | File | After | Call |
|---|---|---|---|---|
| 1a | Activity day created | `src/app/api/activities/[id]/days/route.ts` | `prisma.activityDay.create` | `notifyActivityDayCreated(day.id)` |
| 1b | Activity day updated | `src/app/api/activity-days/[dayId]/route.ts` (PUT) | `prisma.activityDay.update`, only if `date`, `schedule` or `geoLocation` changed | `notifyActivityDayUpdated(day.id)` |
| 2 | Pickup notice created | `src/app/api/activity-days/[dayId]/pickup-notices/route.ts` (POST) | `prisma.pickupNotice.create` | `notifyPickupNoticeCreated(notice.id)` |
| 2b | Pickup notice acknowledged | `src/app/api/pickup-notices/[noticeId]/acknowledgments/route.ts` (POST) | `prisma.pickupNoticeAcknowledgment.create` | `notifyPickupNoticeAcknowledged(ack.id)` |
| 3 | Manual movement created | `src/app/api/accounting/movements/route.ts` (POST) | `prisma.accountingMovement.create` | `notifyPaymentManualCreated(movement.id)` |
| 4 | MP payment approved | `src/app/api/mercadopago/notifications/route.ts` | branch where status transitions to `APPROVED` | `notifyPaymentApproved(payment.id)` |
| 5 | MP payment rejected | same webhook | branch where status transitions to `REJECTED` | `notifyPaymentRejected(payment.id)` |
| 6 | Activity capacity full | participant creation paths (webhook + checkout) | after creating participant; only when count went from `< capacity` to `>= capacity`; skipped if `capacity` is null | `notifyActivityCapacityFull(activity.id)` |
| 7 | Chat message new | `src/app/api/messages/[userId]/route.ts` (POST) | `prisma.message.create` | `notifyChatMessage(message.id)` |

### Per-event rules

- **1b (day updated)**: only fires when one of `date`, `schedule`, `geoLocation` changed. Description-only edits do not notify.
- **2 (pickup notice)**: recipients query first reads `ActivityDayProfessor` for the day; falls back to `ActivityProfessor` of the activity if the day has none. Adds `alternatePersonUserId` if non-null. Pure free-text alternate persons (`alternatePersonName` only) do not generate a notification.
- **6 (capacity full)**: only fires on the transition. The check compares participant count before and after the create within the same handler. If `Activity.capacity` is null, skipped entirely.
- **7 (chat)**: before inserting the `Notification`, the dispatcher checks if there is already an unread `Notification` of type `CHAT_MESSAGE_NEW` for this recipient with the same `data.senderId` and `data.conversationId`. If yes, skip insert and skip push. When the recipient marks the conversation as read in the chat, the corresponding `Notification` rows are also marked read in the same endpoint.

### Events explicitly out of scope

- Activity / group / child / user creation
- Profile edits, photo uploads
- Accounting movement edits, receipt uploads
- Activity day created in an activity with zero participants (no recipients, dispatcher exits cleanly)

---

## Testing strategy

### Unit tests

- `tests/lib/notifications/dispatcher.test.ts` — Prisma and `push-sender` mocked. Verifies preference filtering, `createMany` behavior, parallel push with `allSettled`, `failedAt` marking on 404/410.
- `tests/lib/notifications/recipients.test.ts` — uses test DB. Verifies each recipient resolver returns the right userIds, deduplication, and child→parent translation.
- `tests/lib/notifications/chat-debounce.test.ts` — verifies the "one notification per sender until read" rule across the four scenarios (first, second, different sender, after read).
- `tests/components/notifications/push-permission-modal.test.tsx` — modal visibility based on permission state and localStorage flag, button behavior.
- `tests/components/notifications/notification-bell.test.tsx` — badge counter, polling with fake timers, click-to-navigate.

### Integration tests

`tests/integration/notifications/` — one file per event:

- POST to `/api/activities/[id]/days` creates `Notification` rows for participants; push-sender mocked.
- PUT to `/api/activity-days/[dayId]` with description-only change creates no notifications.
- POST to `/api/accounting/movements` notifies only `COUNTER`, `ADMIN`, `SUPER_ADMIN`.
- MP webhook with status `approved` notifies the payer.

### Manual QA checklist

To verify before merging (not automatable in CI):

- Real push delivery on Chrome (desktop), Firefox (desktop), Edge (desktop), Safari (macOS).
- iOS push delivery after installing the web as a PWA on iOS 16.4+.
- Service worker behavior on push received with the tab closed.
- Native permission prompt UX in each browser, including denied state.
- Modal copy in Spanish.

---

## Open risks

- **iOS PWA constraint**: users on iPhone who don't install the web as a PWA will only see the in-app inbox, not OS push. Will need explanatory copy in the preferences page.
- **`web-push` library dependency**: it's the de facto standard but adds Node-side cryptography. Bundle size impact is server-only, but worth verifying it doesn't break the Next.js build.
- **Polling load**: 60s polling with N authenticated users = N requests/minute baseline against `/api/notifications`. For a club with hundreds of users it's negligible; if it grew significantly, swap to SSE or WebSockets.
- **No outbox**: an unhandled crash between the trigger and the dispatch loses the notification. Acceptable for v1; if it becomes a problem, an outbox table + cron can be added without changing the public API of `notification-service.ts`.
