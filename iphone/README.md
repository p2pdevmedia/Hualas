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

## Backend contract

The app expects these endpoints:

- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/logout`
- `GET /api/mobile/me`
- `GET /api/mobile/home`
- `GET /api/mobile/children`
- `GET /api/mobile/activities`
- `GET /api/mobile/payments`
- `GET /api/mobile/news`
- `POST /api/mobile/devices`
- `GET /api/notifications`
- `PATCH /api/notifications`
- `PATCH /api/notifications/[id]`
- `GET /api/mobile/professor/groups`
- `GET /api/mobile/professor/students`
- `GET /api/mobile/professor/attendance`
- `GET /api/mobile/professor/attendance/[dayId]`
- `PATCH /api/mobile/professor/attendance/[dayId]`

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
