# Hualas Android Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the native Android app for Hualas focused only on Miembros and Profesores.

**Architecture:** The Android app is a native client for the existing `/api/mobile/*` backend. It uses a layered MVVM structure: Compose screens call ViewModels, ViewModels call repositories, repositories call Retrofit services, and the auth/session layer stores the mobile Bearer token in DataStore. The first release should avoid admin/accounting workflows and keep the mobile product centered on agenda, activities, attendance, profile, chat, news, payments, and notifications.

**Tech Stack:** Kotlin, Gradle Kotlin DSL, Jetpack Compose, Material 3, Navigation Compose, Retrofit, OkHttp, Kotlin Serialization, DataStore, Coroutines, ViewModel, Coil, Firebase Cloud Messaging, JUnit, MockWebServer, Compose UI tests.

---

## Scope

### Included

- Login/logout for mobile users.
- Roles limited to `MEMBER` and `PROFESSOR`.
- Role switching when the account has both roles.
- Member home, activities, available activities, profile, children/family, payments, pickup notices, news, chat, and notifications.
- Professor home, agenda, attendance, groups, students, payments, news, chat, and notifications.
- Push token registration for Android devices.
- Release-ready Android project structure under `android/`.

### Excluded

- Admin and super-admin tools.
- Full accounting management.
- Activity creation/editing from Android.
- Mercado Pago SDK integration inside the app. The app can open backend-provided checkout URLs when needed.
- Offline-first sync. The MVP keeps lightweight local session state and fresh API reads.

---

## Existing Backend Surface

Use the current mobile API as the contract:

- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/logout`
- `POST /api/mobile/auth/switch-role`
- `GET /api/mobile/me`
- `GET /api/mobile/home`
- `GET /api/mobile/activities`
- `GET /api/mobile/activities/available`
- `GET /api/mobile/activities/[dayId]`
- `POST /api/mobile/activities/cart/quote`
- `POST /api/mobile/activities/cart/checkout`
- `GET /api/mobile/profile`
- `PATCH /api/mobile/profile`
- `POST /api/mobile/profile/photo`
- `GET /api/mobile/children`
- `POST /api/mobile/children`
- `GET /api/mobile/children/[id]`
- `PATCH /api/mobile/children/[id]`
- `POST /api/mobile/children/[id]/photo`
- `GET /api/mobile/family-groups/current/members`
- `GET /api/mobile/payments`
- `GET /api/mobile/news`
- `POST /api/mobile/news/read`
- `GET /api/mobile/messages`
- `GET /api/mobile/messages/[userId]`
- `POST /api/mobile/messages/[userId]`
- `GET /api/mobile/chat/contacts`
- `GET /api/mobile/notifications`
- `PATCH /api/mobile/notifications/[id]`
- `POST /api/mobile/devices`
- `GET /api/mobile/pickup-notices`
- `POST /api/mobile/pickup-notices`
- `GET /api/mobile/pickup-notices/options`
- `PATCH /api/mobile/pickup-notices/[noticeId]`
- `GET /api/mobile/professor/attendance`
- `GET /api/mobile/professor/attendance/[dayId]`
- `PATCH /api/mobile/professor/attendance/[dayId]`
- `GET /api/mobile/professor/groups`
- `GET /api/mobile/professor/groups/[groupId]`
- `GET /api/mobile/professor/students`

---

## Proposed Android File Structure

Create these top-level files and packages during implementation:

- `android/settings.gradle.kts` - Gradle project settings.
- `android/build.gradle.kts` - root Gradle configuration.
- `android/gradle.properties` - Android and Kotlin build options.
- `android/app/build.gradle.kts` - app module dependencies and build config.
- `android/app/src/main/AndroidManifest.xml` - application manifest.
- `android/app/src/main/java/com/hualas/mobile/HualasApplication.kt` - application entry point.
- `android/app/src/main/java/com/hualas/mobile/MainActivity.kt` - Compose host activity.
- `android/app/src/main/java/com/hualas/mobile/core/network/` - Retrofit, OkHttp, interceptors, API result mapping.
- `android/app/src/main/java/com/hualas/mobile/core/session/` - token storage, session state, role state.
- `android/app/src/main/java/com/hualas/mobile/core/design/` - Material 3 theme, colors, typography, reusable UI primitives.
- `android/app/src/main/java/com/hualas/mobile/core/navigation/` - app routes and role-aware navigation graph.
- `android/app/src/main/java/com/hualas/mobile/features/auth/` - login/logout and role selection.
- `android/app/src/main/java/com/hualas/mobile/features/home/` - role-specific dashboard.
- `android/app/src/main/java/com/hualas/mobile/features/activities/` - agenda, available activities, day detail.
- `android/app/src/main/java/com/hualas/mobile/features/professor/` - attendance, groups, students.
- `android/app/src/main/java/com/hualas/mobile/features/profile/` - profile and photo editing.
- `android/app/src/main/java/com/hualas/mobile/features/children/` - children/family screens.
- `android/app/src/main/java/com/hualas/mobile/features/payments/` - member/professor payment views.
- `android/app/src/main/java/com/hualas/mobile/features/news/` - news list/detail and read state.
- `android/app/src/main/java/com/hualas/mobile/features/chat/` - conversations, contacts, message thread.
- `android/app/src/main/java/com/hualas/mobile/features/notifications/` - notification inbox and FCM registration.
- `android/app/src/test/java/com/hualas/mobile/` - unit tests.
- `android/app/src/androidTest/java/com/hualas/mobile/` - Compose and navigation tests.
- `android/README.md` - setup, commands, environment, and release workflow.

---

## Stage 0: Product And API Contract Lock

**Objective:** Confirm the exact Android MVP and freeze the first mobile contract.

**Deliverables:**

- [x] Confirm that Android is only for `MEMBER` and `PROFESSOR`.
- [x] Confirm that admin, super-admin, and accounting admin screens stay web-only.
- [x] Document base URL handling for local, staging, and production in `android/README.md`.
- [x] Review JSON shapes returned by every `/api/mobile/*` endpoint listed above.
- [x] Create a simple API contract table with request method, path, role, purpose, and Android screen owner.
- [x] Identify backend gaps before Android screen work starts.

**Validation:**

- Run backend lint before Android implementation begins:

```bash
pnpm lint
```

- Confirm local mobile auth responds with a controlled invalid-login error:

```bash
curl -i -X POST http://localhost:3000/api/mobile/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"invalid@example.com","password":"invalid"}'
```

Expected: `401` with `Credenciales invalidas` or the current Spanish invalid-credentials response.

**Exit Criteria:**

- The team can point each MVP screen to a concrete `/api/mobile/*` route.
- No Android code depends on admin or web-only session cookies.

---

## Stage 1: Android Project Foundation

**Objective:** Create a clean native Android project in the empty `android/` folder.

**Deliverables:**

- [x] Create Gradle Kotlin DSL project and `app` module.
- [x] Configure Kotlin, Compose, Material 3, Navigation Compose, ViewModel, DataStore, Retrofit, OkHttp, Kotlin Serialization, Coil, Firebase Messaging, JUnit, MockWebServer, and Compose test dependencies.
- [x] Add `HualasApplication`.
- [x] Add `MainActivity` as the Compose host.
- [x] Add Material 3 theme with Hualas visual identity: quiet operational UI, clear contrast, outdoor/local feel, Spanish labels.
- [x] Add `android/README.md` with setup and commands.

**Validation:**

```bash
cd android
./gradlew :app:assembleDebug
./gradlew :app:testDebugUnitTest
```

Expected: debug APK builds and unit test task passes.

**Exit Criteria:**

- The app launches to a placeholder shell.
- The project can be opened in Android Studio without Gradle sync errors.

---

## Stage 2: Core Infrastructure

**Objective:** Build the reusable foundation before feature screens.

**Deliverables:**

- [x] Implement `ApiClient` with Retrofit base URL.
- [x] Implement `AuthInterceptor` that adds `Authorization: Bearer <token>`.
- [x] Implement `SessionStore` with DataStore for token, user id, active mobile role, allowed roles, and expiry.
- [x] Implement typed API result handling for success, validation errors, unauthorized, forbidden, not found, and network failure.
- [x] Implement app-level state restoration: splash/loading, authenticated, unauthenticated.
- [x] Add shared UI states: loading, empty, inline error, retry, pull-to-refresh.

**Validation:**

```bash
cd android
./gradlew :app:testDebugUnitTest
```

Expected:

- Token is persisted and cleared correctly.
- Authorization header is added only when a token exists.
- HTTP `401` clears or invalidates the active session.
- Network errors produce retryable UI state.

**Exit Criteria:**

- Feature teams can add screens without reimplementing auth, network, or loading/error behavior.

---

## Stage 3: Authentication And Role Shell

**Objective:** Make login, logout, session restore, and role-aware navigation work end to end.

**Deliverables:**

- [x] Login screen using `POST /api/mobile/auth/login`.
- [x] Store mobile token and session from login response.
- [x] Session restore using `GET /api/mobile/me`.
- [x] Logout using `POST /api/mobile/auth/logout` and local session clear.
- [x] Role switch screen/action using `POST /api/mobile/auth/switch-role`.
- [x] Root navigation that exposes only member screens for `MEMBER` and professor screens for `PROFESSOR`.
- [x] User-facing Spanish copy for auth failures and expired sessions.

**Validation:**

```bash
cd android
./gradlew :app:testDebugUnitTest
./gradlew :app:connectedDebugAndroidTest
```

Expected:

- Invalid login shows an inline error.
- Valid login enters the correct role home.
- Logout returns to login.
- A user with both roles can switch and sees role-specific tabs.

**Exit Criteria:**

- Authentication is production-shaped enough for all feature stages.

---

## Stage 4: Home And Primary Navigation

**Objective:** Build the first useful app experience for both roles.

**Deliverables:**

- [x] Member home backed by `GET /api/mobile/home`.
- [x] Professor home backed by `GET /api/mobile/home`.
- [x] Bottom navigation with role-aware destinations:
  - Member: Inicio, Actividades, Familia, Pagos, Chat, Mas.
  - Professor: Inicio, Agenda, Asistencia, Grupos, Chat, Mas.
- [x] Show unread notification counts when present.
- [x] Show recent news cards from home response.
- [x] Keep dense, scan-friendly cards and lists; avoid marketing-style hero screens.

**Validation:**

```bash
cd android
./gradlew :app:testDebugUnitTest
./gradlew :app:connectedDebugAndroidTest
```

Expected:

- Member home renders children, activities, upcoming days, stats, and news.
- Professor home renders assigned activities, upcoming days, pending attendance, stats, and news.
- Role switching updates visible navigation immediately.

**Exit Criteria:**

- A logged-in user can understand what needs attention today.

---

## Stage 5: Activities, Agenda, And Day Detail

**Objective:** Build shared activity and agenda flows for members and professors.

**Deliverables:**

- [x] Agenda list/calendar backed by `GET /api/mobile/activities`.
- [x] Day filtering with `day=YYYY-MM-DD` and summary mode where useful.
- [x] Activity/day detail backed by `GET /api/mobile/activities/[dayId]`.
- [x] Member available activities backed by `GET /api/mobile/activities/available`.
- [x] Member checkout entry backed by `/api/mobile/activities/cart/quote` and `/api/mobile/activities/cart/checkout`.
- [x] External browser handoff for checkout URLs.
- [x] Cancelled-day labels and group labels.

**Validation:**

```bash
cd android
./gradlew :app:testDebugUnitTest
./gradlew :app:connectedDebugAndroidTest
```

Expected:

- Member sees only activities and days visible for their family participation.
- Professor sees assigned activity days.
- Cancelled days are clearly marked.
- Checkout opens externally and does not pretend payment completed until backend data confirms it.

**Exit Criteria:**

- Members and professors can use the app as their daily activity agenda.

---

## Stage 6: Professor Workflows

**Objective:** Make the professor app operational in the field.

**Deliverables:**

- [ ] Attendance day list from `GET /api/mobile/professor/attendance`.
- [ ] Attendance detail from `GET /api/mobile/professor/attendance/[dayId]`.
- [ ] Attendance update using `PATCH /api/mobile/professor/attendance/[dayId]`.
- [ ] Groups list from `GET /api/mobile/professor/groups`.
- [ ] Group detail from `GET /api/mobile/professor/groups/[groupId]`.
- [ ] Student list from `GET /api/mobile/professor/students`.
- [ ] Student filtering by group when a group is selected.
- [ ] Clear forbidden-state copy when professor endpoints are requested as member.

**Validation:**

```bash
cd android
./gradlew :app:testDebugUnitTest
./gradlew :app:connectedDebugAndroidTest
```

Expected:

- Professor can mark attendance as present/absent/pending according to backend allowed statuses.
- Group-restricted days do not show students outside the group.
- Refresh after attendance update shows the persisted status.

**Exit Criteria:**

- A professor can run class attendance from Android without using the web app.

---

## Stage 7: Member Profile, Family, Payments, And Pickup Notices

**Objective:** Complete the member self-service flows.

**Deliverables:**

- [ ] Profile view/edit from `GET/PATCH /api/mobile/profile`.
- [ ] Profile photo upload from `POST /api/mobile/profile/photo`.
- [ ] Children list/create/edit from `/api/mobile/children`.
- [ ] Child photo upload from `POST /api/mobile/children/[id]/photo`.
- [ ] Family members from `GET /api/mobile/family-groups/current/members`.
- [ ] Member payments from `GET /api/mobile/payments`.
- [ ] Pickup notice list/create/edit/options from `/api/mobile/pickup-notices*`.
- [ ] Inline validation for required fields before profile or child save.

**Validation:**

```bash
cd android
./gradlew :app:testDebugUnitTest
./gradlew :app:connectedDebugAndroidTest
```

Expected:

- Saved profile changes reload from the backend.
- Child create/edit flows preserve required medical/contact fields.
- Payment list shows amount, status, reference, and date.
- Pickup notice creation uses backend-provided activity-day options.

**Exit Criteria:**

- A member can maintain their family profile and key operational notices from Android.

---

## Stage 8: News, Chat, Notifications, And Push

**Objective:** Build communication features needed by both roles.

**Deliverables:**

- [ ] News feed from `GET /api/mobile/news`.
- [ ] Mark news read using `POST /api/mobile/news/read`.
- [ ] Conversations list from `GET /api/mobile/messages`.
- [ ] Contacts from `GET /api/mobile/chat/contacts`.
- [ ] Message thread from `GET /api/mobile/messages/[userId]`.
- [ ] Send message using `POST /api/mobile/messages/[userId]`.
- [ ] Notification inbox from `GET /api/mobile/notifications`.
- [ ] Mark notification read using `PATCH /api/mobile/notifications/[id]`.
- [ ] Firebase Cloud Messaging token registration using `POST /api/mobile/devices` with `platform: "Android"`.

**Validation:**

```bash
cd android
./gradlew :app:testDebugUnitTest
./gradlew :app:connectedDebugAndroidTest
```

Expected:

- News read state persists.
- Sending a message inserts it in the thread and appears after refresh.
- Notification read state persists.
- Android push token registration sends platform `Android` and current app version.

**Exit Criteria:**

- The app supports day-to-day club communication for both roles.

---

## Stage 9: Quality, Accessibility, And Release Preparation

**Objective:** Prepare the Android app for internal testing and release.

**Deliverables:**

- [ ] Add app icon, adaptive icon, and splash screen assets.
- [ ] Add release signing documentation in `android/README.md`.
- [ ] Add build variants for local/staging/production API URLs.
- [ ] Add ProGuard/R8 rules needed by Retrofit, serialization, Coil, and Firebase.
- [ ] Add accessibility labels for icon buttons, tabs, form fields, and attendance controls.
- [ ] Add empty/error/loading screenshots or QA notes for major screens.
- [ ] Add smoke test checklist for member and professor accounts.
- [ ] Run Android lint and fix actionable issues.

**Validation:**

```bash
cd android
./gradlew :app:lintDebug
./gradlew :app:testDebugUnitTest
./gradlew :app:connectedDebugAndroidTest
./gradlew :app:assembleRelease
```

Expected:

- Lint has no release-blocking errors.
- Tests pass.
- Release APK/AAB builds locally when signing config is available.

**Exit Criteria:**

- The app is ready for internal distribution to Club Hualas testers.

---

## Suggested Milestones

### Milestone 1: Technical Shell

Includes Stages 1, 2, and 3.

Outcome: users can install the debug app, log in, restore session, logout, and switch between Member and Professor roles.

### Milestone 2: Daily Use MVP

Includes Stages 4, 5, and 6.

Outcome: members and professors can use the app for home, agenda, activities, and professor attendance.

### Milestone 3: Member Self-Service

Includes Stage 7.

Outcome: members can manage profile, family data, payments, and pickup notices.

### Milestone 4: Communication And Release

Includes Stages 8 and 9.

Outcome: chat, news, notifications, push registration, and release readiness are complete.

---

## Testing Strategy

- Unit tests for repositories, session storage, API result mapping, and ViewModels.
- MockWebServer tests for login, role switching, expired token, attendance update, profile update, and chat send.
- Compose UI tests for login, role navigation, home, agenda, attendance, and profile edit.
- Manual QA on a real Android device for camera/photo upload, external checkout browser, push token registration, and poor network behavior.

---

## Backend Risks To Check Before Implementation

- Some endpoint response shapes may need dedicated Android DTOs if they currently drift between screens.
- `POST /api/mobile/devices` defaults platform to `iOS`; Android must explicitly send `Android`.
- Checkout behavior depends on backend returning a URL that Android can open safely.
- Push delivery may require Firebase server-side configuration beyond Android token registration.
- Photo upload limits, accepted MIME types, and error messages should be verified before mobile photo UI is built.

---

## Short Review

- The plan keeps Android focused on members and professors, matching the requested scope.
- It reuses the existing `/api/mobile/*` backend instead of duplicating business logic in the app.
- The highest-risk stage is professor attendance because it is operational and permission-sensitive.
- The second highest-risk area is push notifications because Android client setup and backend delivery config both have to line up.
- No existing user changes in the iPhone workspace are part of this plan.
