# Hualas Project Context

Hualas is a full-stack club management system for Club Hualas, a mountain/outdoor club in San Martin de los Andes, Patagonia.

## Purpose

The application helps club operators manage:

- members / socios / parents
- children linked to adult members
- family groups and tutors
- activities and registrations
- payments through Mercado Pago
- manual transfer payments and accounting review
- admin forms and responses
- member profiles and profile photos
- activity days, groups, attendance, observations, and pickup notices
- internal messages / chat
- notifications and mobile push devices
- professor banking data, invoices, and payments
- site branding and public information
- public visual story content, including the local PDF/book viewer for
  `Pequeños habitantes de la tierra` at `/habitantes-de-la-tierra`

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
- native iPhone app in `iphone/HualasMobile`
- native Android app in `android`
- pnpm

## Important Commands

```bash
pnpm install
pnpm prisma:generate
pnpm dev
pnpm build
pnpm lint
pnpm format:check
pnpm test
```

## Main Data Models

See `prisma/schema.prisma`.

Important models:

- `User`: adult member / parent account. Roles: `MEMBER`, `PROFESSOR`, `COUNTER`, `ADMIN`, `SUPER_ADMIN`.
- `UserRoleAssignment`: extra role capabilities available to a user.
- `Child`: child profile linked to a `User`.
- `FamilyGroup`, `FamilyGroupMember`: family/tutor grouping and payment responsibility.
- `Activity`: club activity, course, outing, or subscription.
- `ActivityMedia`: images/videos attached to an activity.
- `ActivityParticipant`: user or child registered to an activity.
- `ActivityParticipantPayment`: monthly/session payments tied to activity participants.
- `ActivityProfessor`: professor assignments for activities.
- `ActivityGroup`: group definitions within an activity.
- `ActivityGroupProfessor`: professor assignments for groups.
- `ActivityGroupMember`: participant membership in an activity group.
- `ActivityDay`: scheduled day for an activity with location, description, and schedule.
- `ActivityDayAttendance`: per-day confirmation record for registered participants.
- `ActivityParticipantReport`: per-day participant notes/reports.
- `PickupNotice`, `PickupNoticeAcknowledgment`: alternate pickup notices and professor acknowledgment.
- `Form`, `FormField`, `FormResponse`: custom admin forms.
- `Conversation`, `Message`: internal chat.
- `News`, `NewsMedia`, `NewsReadReceipt`: institutional news, media, and read state.
- `Notification`, `NotificationPreference`, `PushAlertSubscription`: in-app and web push notifications.
- `MobileSession`, `MobileDeviceToken`: native app auth and device push tokens.
- `AccountingMovement`, `AccountingMonthClose`: accounting ledger and month-end snapshots.
- `BillableConcept`, `Order`, `OrderItem`, `Payment`, `SocialFeePayment`: billing and payment records.
- `ProfessorProfile`, `ProfessorPayment`, `ProfessorInvoice`: professor accounting.
- `MercadoPagoNotification`: stored webhook notifications.
- `DbAuditLog`: audit trail rows.

Database integrity notes:

- Professor access for grouped activity days uses `ActivityGroupProfessor`; ungrouped activity days fall back to `ActivityProfessor`. The retired `ActivityDayProfessor` table only exists in historical migrations.
- Some database-only guards are implemented as SQL partial unique indexes because Prisma schema cannot represent them: adult `SocialFeePayment` rows are unique per user/month/year when `childId IS NULL`, and non-null `Payment.providerPaymentId` values are unique per provider.
- `ActivityParticipantPayment` has database check constraints requiring monthly payments to carry `periodMonth`/`periodYear` and session payments to carry `activityDayId`.

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
- Public users can open `/habitantes-de-la-tierra` from the home page to read
  the local `Pequeños habitantes de la tierra` PDF as a one-page-at-a-time
  book viewer. The viewer loads all PDF pages into its cache when the document
  opens and supports page turns from the arrow buttons, keyboard arrows, and
  clicks on the right or left half of the visible page.
- Logged-in users can access profile, chat, notifications, children/family data, activity checkout, payments, pickup notices, and personal registration flows.
- Logged-in professors can access `my-activities`, manage activity days for assigned activities, and see their assigned activities alongside enrollments.
- Logged-in professors and admins assign registered users to activity groups.
- Logged-in professors and admins can open a group detail view to review members and add or remove participants from that group.
- Activity days can be restricted to a single group; attendance confirmation is blocked for participants outside that group.
- `COUNTER` and active `ADMIN` can access accounting.
- `ADMIN` and `SUPER_ADMIN` capabilities can manage activities, users, and forms through the active `ADMIN` profile.
- `SUPER_ADMIN` capability gates audit log and admin notification pages.
- Users can have multiple capabilities; page visibility follows `activeRole` and role switching.

## Payment Rules

- Activity checkout uses Mercado Pago.
- Activity checkout also supports manual transfer proof flows for review.
- Approved Mercado Pago payments create or update `ActivityParticipant` records.
- Approved manual payments can also create or update payment/participant state depending on the flow.
- Capacity must be checked before registering a participant.
- Activity registration may be for the logged-in user or one of their children.
- Accounting includes social fees, draft orders, order items, manual movements, Mercado Pago payments, manual payment approval/rejection, professor invoices/payments, transferred professor invoice movements in the accounting dashboard, activity cashbox receipt links, and month-close snapshots.
- Professor payment workflow starts from a professor-uploaded invoice tied to one of the professor's assigned activities. Invoice upload accepts PDF and common mobile gallery image formats including JPG, PNG, WebP, HEIC, and HEIF. Android/Samsung JPEG uploads are accepted even when the browser reports `image/jpg` or a generic file content type with a `.jpg`/`.jpeg` filename. Accounting approves the invoice with period and amount from the pending invoice status in `/accounting/professors/[id]`, then treasury marks the linked payment as transferred. A professor can have multiple approved invoices/payments for the same month. Professor payments copy the invoice activity so transferred honorarios appear as activity cashbox expenses in `/accounting/movements/activities`. Professors see invoice states as pending, approved, or transferred in `/my-payments`.
- Private file uploads, including professor invoices, require Vercel Blob storage through `BLOB_READ_WRITE_TOKEN`.

## Development Rules

- Inspect `ROUTE_MAP.md` before changing pages or API routes.
- Inspect `prisma/schema.prisma` before changing data logic.
- Every new or changed feature must update the relevant agent-facing docs in the same task, especially `PROJECT_CONTEXT.md`, `ROUTE_MAP.md`, `.agent-registry.yaml`, platform READMEs/contracts, and README setup notes.
- Do not leave new functionality discoverable only by reading the source tree; future agents should be able to find it from the context and route map first.
- Before finishing a task, run `pnpm format:check` and attempt `pnpm build`; if repo-wide Prettier reports unrelated existing files, ensure touched files pass and report the remaining debt. If either cannot run or fails because of environment constraints, report the exact command and reason.
- For native mobile clients, use `/api/mobile/*` and bearer-token auth, not NextAuth cookie routes.
- iPhone code lives under `iphone/HualasMobile`; Android code lives under `android`.
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
