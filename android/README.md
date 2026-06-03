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
- Gradle wrapper files in this directory.
- Network access to `https://hualas.vercel.app/` for `localDebug` builds.

If Gradle cannot find the Android SDK, set `ANDROID_HOME` or create `local.properties`:

```properties
sdk.dir=/home/negra/Android/Sdk
```

## API Environments

Build flavors define the API base URL:

- `local`: `https://hualas.vercel.app/` for phone and emulator smoke testing against the deployed backend.
- `staging`: `https://hualas.vercel.app/` until a separate staging domain exists.
- `production`: `https://hualas.vercel.app/`.

Before release, split `staging` into its own backend domain if the project has one.

## Commands

From this directory:

```bash
./gradlew :app:assembleLocalDebug
./gradlew :app:testLocalDebugUnitTest
./gradlew :app:lintLocalDebug
./gradlew :app:connectedLocalDebugAndroidTest
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

Mobile checkout and media notes:

- Manual-transfer checkout creates pending access only; activity access appears
  after accounting approval.
- Profile/child photo uploads must contain real JPG, PNG, GIF, or WebP bytes.
  Spoofed image/SVG content is rejected server-side.
- Professor student/group screens are scoped to the professor's assigned groups.

## First Implementation Milestones

1. Project shell and Material 3 theme.
2. Network/session foundation.
3. Login, logout, session restore, and role switch.
4. Member/professor home.
5. Activities and agenda.
6. Professor attendance.
7. Member profile, family, payments, and pickup notices.
8. News, chat, notifications, and push.
