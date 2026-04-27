# Hualas Project Context

Hualas is a full-stack club management system for Club Hualas, a mountain/outdoor club in San Martin de los Andes, Patagonia.

## Purpose

The application helps club operators manage:

- members / socios / parents
- children linked to adult members
- activities and registrations
- payments through Mercado Pago
- admin forms and responses
- member profiles and profile photos
- internal messages / chat
- site branding and public information

## Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- NextAuth
- Mercado Pago
- Vercel Blob
- Pinata/IPFS for site assets
- pnpm

## Important Commands

```bash
pnpm install
pnpm prisma:generate
pnpm dev
pnpm build
pnpm lint
```

## Main Data Models

See `prisma/schema.prisma`.

Important models:

- `User`: adult member / parent account. Roles: `MEMBER`, `PROFESSOR`, `ADMIN`, `SUPER_ADMIN`.
- `Child`: child profile linked to a `User`.
- `Activity`: club activity, course, outing, or subscription.
- `ActivityParticipant`: user or child registered to an activity.
- `ActivityProfessor`: professor assignments for activities.
- `ActivityDay`: scheduled day for an activity with location, description, and schedule.
- `ActivityDayAttendance`: per-day confirmation record for registered participants.
- `Form`, `FormField`, `FormResponse`: custom admin forms.
- `Conversation`, `Message`: internal chat.
- `SiteSetting`: logo/favicon/site branding.
- `MercadoPagoNotification`: stored webhook notifications.

## Product Rules

- This is not a rental platform.
- Treat Hualas as a club/member/activity administration system.
- Prefer admin-first UX: clear tables, forms, status labels, and direct workflows.
- Public pages should feel local, outdoor, Patagonia/mountain oriented.
- Keep Spanish user-facing text natural for Argentina.
- Keep code, variable names, and component names in English.
- Avoid browser `alert()`; use inline states, toasts, dialogs, or proper UI feedback.

## Access Rules

- Public users can see the home/contact pages and auth pages.
- Logged-in users can access profile, chat, children data, activity checkout, and personal registration flows.
- Logged-in professors can access `my-activities`, manage activity days for assigned activities, and see their assigned activities alongside enrollments.
- `ADMIN` and `SUPER_ADMIN` can manage activities, users, forms, and notifications.
- `SUPER_ADMIN` alone can access site settings.

## Payment Rules

- Activity checkout uses Mercado Pago.
- Approved Mercado Pago payments create or update `ActivityParticipant` records.
- Capacity must be checked before registering a participant.
- Activity registration may be for the logged-in user or one of their children.

## Development Rules

- Inspect `ROUTE_MAP.md` before changing pages or API routes.
- Inspect `prisma/schema.prisma` before changing data logic.
- Reuse existing components and patterns before creating new ones.
- Do not introduce large dependencies unless clearly justified.
- Never commit secrets or `.env` files.
- Do not invent environment variables without documenting them in README or relevant docs.

## Final Task Output

When finishing a task, include:

- what changed
- files touched
- tests or verification run
- unresolved risks
