# Hualas iPhone App

SwiftUI scaffold for the native iOS client that talks to the Next.js backend through `/api/mobile/*`.

## What is included

- Separate mobile login backed by a bearer token.
- Member and professor flows with role-specific home screens.
- APNs registration flow that posts the device token to the backend.
- Screen scaffolding for:
  - Login
  - Home socio
  - Mis hijos
  - Mis actividades
  - Pagos
  - Noticias
  - Home profesor
  - Grupos
  - Alumnos
  - Asistencia
  - Tutores

## Backend contract

The app expects these endpoints:

- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/logout`
- `POST /api/mobile/auth/switch-role`
- `GET /api/mobile/me`
- `GET /api/mobile/home`
- `GET /api/mobile/profile`
- `PATCH /api/mobile/profile`
- `GET /api/mobile/profile/photo`
- `POST /api/mobile/profile/photo`
- `GET /api/mobile/children`
- `POST /api/mobile/children`
- `GET /api/mobile/children/[id]`
- `PUT /api/mobile/children/[id]`
- `GET /api/mobile/children/[id]/photo`
- `POST /api/mobile/children/[id]/photo`
- `GET /api/mobile/activities`
- `GET /api/mobile/activities?month=YYYY-MM&summary=1`
- `GET /api/mobile/activities?month=YYYY-MM&day=YYYY-MM-DD`
- `GET /api/mobile/activities/[dayId]`
- `GET /api/mobile/activities/available`
- `POST /api/mobile/activities/cart/quote`
- `POST /api/mobile/activities/cart/checkout`
- `GET /api/mobile/payments`
- `GET /api/mobile/news`
- `POST /api/mobile/news/read`
- `GET /api/mobile/messages`
- `GET /api/mobile/messages/[userId]`
- `POST /api/mobile/messages/[userId]`
- `GET /api/mobile/chat/contacts`
- `GET /api/mobile/family-groups/current/members`
- `POST /api/mobile/family-groups/current/members`
- `DELETE /api/mobile/family-groups/current/members`
- `POST /api/mobile/devices`
- `GET /api/mobile/notifications`
- `PATCH /api/mobile/notifications`
- `PATCH /api/mobile/notifications/[id]`
- `GET /api/mobile/pickup-notices`
- `POST /api/mobile/pickup-notices`
- `GET /api/mobile/pickup-notices/options`
- `PUT /api/mobile/pickup-notices/[noticeId]`
- `DELETE /api/mobile/pickup-notices/[noticeId]`
- `GET /api/mobile/professor/groups`
- `GET /api/mobile/professor/groups/[groupId]`
- `GET /api/mobile/professor/students`
- `GET /api/mobile/professor/attendance`
- `GET /api/mobile/professor/attendance/[dayId]`
- `PATCH /api/mobile/professor/attendance/[dayId]`

The iPhone app caches the activities calendar summary, the sessions for each day, and the detail for each session locally. Pull-to-refresh forces a fresh fetch.
The chat screen also exposes a member-only "Nuevo chat" picker that lists tutors, professors linked to family participants, and club admin/accounting contacts.
Manual-transfer checkout creates pending access only; activity access appears
after accounting approval. Profile and child photo uploads must contain real
JPG, PNG, GIF, or WebP bytes, and professor student/group data is scoped to the
professor's assigned groups.

## Xcode setup

- Open `iphone/HualasMobile.xcodeproj` in Xcode.
- Select the `HualasMobile` target and choose your Apple Development team.
- For a physical iPhone, change `API_BASE_URL` in `iphone/HualasMobile/Info.plist` to the IP or tunnel URL of your Mac, not `localhost`.
- Keep Push Notifications capability enabled and Remote Notifications in Background Modes.
- Install and run on the connected iPhone from Xcode.

## APNs delivery

The app registers the APNs device token automatically and sends it through `POST /api/mobile/devices`.
To actually deliver remote pushes to the device, the backend needs these environment variables:

- `APPLE_APNS_TEAM_ID`
- `APPLE_APNS_KEY_ID`
- `APPLE_APNS_PRIVATE_KEY`
- `APPLE_APNS_BUNDLE_ID`

`APPLE_APNS_PRIVATE_KEY` should contain the Apple `.p8` key contents with escaped newlines or literal newlines.
Debug builds use the APNs development endpoint; release builds use the production endpoint.

## Quick test checklist

1. Start the web app locally with `pnpm dev`.
2. Edit `API_BASE_URL` to reach that backend from the iPhone.
3. Sign in once with your email and password.
4. Open `Perfil` to switch between socio and profesor if the account has both profiles.
5. Verify the home tabs load data in the selected profile.
6. On a real device, confirm APNs permission is requested and the token is stored through `POST /api/mobile/devices`.
