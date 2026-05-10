# Hualas Android

Native Android app for Hualas members and professors.

## Scope

This app is only for:

- `MEMBER`: socios, families, children, activities, payments, pickup notices, news, chat, and notifications.
- `PROFESSOR`: assigned activities, agenda, attendance, groups, students, payments, news, chat, and notifications.

Admin, super-admin, and accounting management workflows remain web-only.

## Stack

- Kotlin
- Gradle Kotlin DSL
- Jetpack Compose
- Material 3
- Navigation Compose
- Retrofit and OkHttp
- Kotlin Serialization
- DataStore
- Coil
- Firebase Cloud Messaging

## Local Requirements

- Android Studio with Android SDK Platform 35.
- JDK 17.
- Gradle wrapper files generated or Gradle installed locally.
- The Hualas web backend running locally for `localDebug` builds.

The current Codex environment does not have Java, Gradle, or the Android SDK installed, so compile verification may need to run from Android Studio or a developer machine.

## API Environments

Build flavors define the API base URL:

- `local`: `http://10.0.2.2:3000/` for Android emulator talking to a local Next.js server.
- `staging`: `https://hualas.vercel.app/` until a separate staging domain exists.
- `production`: `https://hualas.vercel.app/`.

Before release, split `staging` into its own backend domain if the project has one.

## Commands

From this directory:

```bash
./gradlew :app:assembleLocalDebug
./gradlew :app:testLocalDebugUnitTest
./gradlew :app:connectedLocalDebugAndroidTest
```

If the Gradle wrapper is not present yet, generate it from a machine with Gradle installed:

```bash
gradle wrapper --gradle-version 8.11.1
```

## Backend Contract

The Android app should use the existing `/api/mobile/*` endpoints. Authentication uses a mobile Bearer token returned by:

```text
POST /api/mobile/auth/login
```

Each authenticated request must send:

```text
Authorization: Bearer <mobile-token>
```

Android push registration must send `platform: "Android"` to:

```text
POST /api/mobile/devices
```

## First Implementation Milestones

1. Project shell and Material 3 theme.
2. Network/session foundation.
3. Login, logout, session restore, and role switch.
4. Member/professor home.
5. Activities and agenda.
6. Professor attendance.
7. Member profile, family, payments, and pickup notices.
8. News, chat, notifications, and push.
