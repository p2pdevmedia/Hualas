# Hualas Route Map

This file describes main frontend routes and API endpoints.

Agents should check this before searching the codebase.

---

## Frontend Routes (Next.js App Router)

### Public

- `/` → Home page
  - File: `src/app/page.tsx`

- `/contact` → Contact page
  - File: `src/app/contact/page.tsx`
  - Related component: `src/app/contact/contact-form.tsx`

- `/faq` → Frequently Asked Questions
  - File: `src/app/faq/page.tsx`
  - Explains application flow, user roles, activities, and social fees

### Auth

- `/login` → Login page
  - File: `src/app/login/page.tsx`

- `/register` → Register page
  - File: `src/app/register/page.tsx`

### Activities

- `/activities` → Admin activities list
  - File: `src/app/activities/page.tsx`
  - Related component: `src/components/activities-heading.tsx`

- `/activities/join/[id]` → Public activity join landing page
  - File: `src/app/activities/join/[id]/page.tsx`
  - Used from the home page for activity inscription entry

- `/activities/new` → Create activity
  - File: `src/app/activities/new/page.tsx`
  - Related form: `src/app/activities/new/form.tsx`

- `/activities/[id]` → Activity detail
  - File: `src/app/activities/[id]/page.tsx`
  - Related components:
    - `src/app/activities/[id]/payment-handler.tsx`
  - Used for the detail view from `my-activities` and admin contexts
  - Does not include the public inscription CTA; that lives under `/activities/join/[id]`

- `/activities/[id]/groups/[groupId]` → Activity group detail
  - File: `src/app/activities/[id]/groups/[groupId]/page.tsx`
  - Related component: `src/app/activities/[id]/groups/[groupId]/group-members-manager.tsx`

- `/activities/[id]/edit` → Edit activity
  - File: `src/app/activities/[id]/edit/page.tsx`
  - Related form: `src/app/activities/[id]/edit/form.tsx`

### User

- `/profile` → User profile
  - File: `src/app/profile/page.tsx`
  - Related components:
    - `src/app/profile/form.tsx`
    - `src/app/profile/profile-photo-upload.tsx`
    - `src/app/profile/children.tsx`

- `/profile/pickup-notices` → Pickup notices list
  - File: `src/app/profile/pickup-notices/page.tsx`
  - Displays user's active pickup notices

- `/profile/pickup-notices/new` → Create pickup notice
  - File: `src/app/profile/pickup-notices/new/page.tsx`
  - Related component: `src/app/profile/pickup-notices/new/activity-day-selector.tsx`

- `/profile/pickup-notices/[noticeId]/edit` → Edit pickup notice
  - File: `src/app/profile/pickup-notices/[noticeId]/edit/page.tsx`

- `/chat` → Internal chat
  - File: `src/app/chat/page.tsx`
  - Related client: `src/app/chat/chat-client.tsx`

- `/my-activities` → My activities for members and professors
  - File: `src/app/my-activities/page.tsx`

- `/professors/[id]` → Public professor profile with contact data
  - File: `src/app/professors/[id]/page.tsx`

### Accounting

- `/accounting` → Accounting dashboard
  - File: `src/app/accounting/page.tsx`
  - Layout guard: `src/app/accounting/layout.tsx`

- `/accounting/social-fee` → Social fee management
  - File: `src/app/accounting/social-fee/page.tsx`
  - Related client form: `src/app/accounting/social-fee/social-fee-settings-form.tsx`

- `/accounting/debt-by-family` → Family debt status dashboard
  - File: `src/app/accounting/debt-by-family/page.tsx`

- `/accounting/movements` → Manual movements list
  - File: `src/app/accounting/movements/page.tsx`
  - Related component: `src/app/accounting/movements/movements-table.tsx`

- `/accounting/movements/new` → Create movement
  - File: `src/app/accounting/movements/new/page.tsx`
  - Related form: `src/app/accounting/movements/movement-form.tsx`

- `/accounting/movements/[id]/edit` → Edit movement
  - File: `src/app/accounting/movements/[id]/edit/page.tsx`
  - Related form: `src/app/accounting/movements/movement-form.tsx`

- `/accounting/payments` → Mercado Pago payments read-only
  - File: `src/app/accounting/payments/page.tsx`

- `/accounting/professors` → Professor payment management (COUNTER/ADMIN)
  - File: `src/app/accounting/professors/page.tsx`

- `/accounting/professors/[id]` → Professor banking data + salary + payment history
  - File: `src/app/accounting/professors/[id]/page.tsx`
  - Related form: `src/app/accounting/professors/[id]/professor-profile-form.tsx`

- `/accounting/reports` → Reports with CSV/PDF export
  - File: `src/app/accounting/reports/page.tsx`
  - Related client: `src/app/accounting/reports/reports-client.tsx`

- `/my-payments` → Professor self-view of banking data and payment history (read-only)
  - File: `src/app/my-payments/page.tsx`

### Admin

- `/admin/users` → Users list
  - File: `src/app/admin/users/page.tsx`
  - Related component: `src/app/admin/users/users-list.tsx`

- `/admin/users/new` → Create user
  - File: `src/app/admin/users/new/page.tsx`
  - Related form: `src/app/admin/users/new/form.tsx`

- `/admin/users/[id]` → Edit user
  - File: `src/app/admin/users/[id]/page.tsx`
  - Related form: `src/app/admin/users/[id]/form.tsx`

- `/admin/users/[id]/view` → User detail
  - File: `src/app/admin/users/[id]/view/page.tsx`

- `/admin/users/[id]/add-tutor` → Add tutor to user's family group (ADMIN/SUPER_ADMIN only, selects from active system users)
  - File: `src/app/admin/users/[id]/add-tutor/page.tsx`
  - Related form: `src/app/admin/users/[id]/add-tutor/add-tutor-admin-form.tsx`
  - API: `POST /api/admin/users/[id]/tutors`

- `/admin/users/[id]/merge-children` → Merge two children of a user (ADMIN/SUPER_ADMIN only)
  - File: `src/app/admin/users/[id]/merge-children/page.tsx`
  - Related client: `src/app/admin/users/[id]/merge-children/merge-client.tsx`
  - API: `POST /api/admin/users/[id]/merge-children`

- `/admin/forms` → Forms list
  - File: `src/app/admin/forms/page.tsx`
  - Related components:
    - `src/app/admin/forms/form-list.tsx`
    - `src/app/admin/forms/new-form.tsx`

- `/admin/forms/new` → Create form
  - File: `src/app/admin/forms/new/page.tsx`
  - Related component: `src/app/admin/forms/new-form.tsx`

- `/admin/forms/[id]` → Form responses
  - File: `src/app/admin/forms/[id]/page.tsx`

- `/admin/notifications` → MercadoPago notifications
  - File: `src/app/admin/notifications/page.tsx`

### Forms (public/admin usage)

- `/forms/[id]` → Form display
  - File: `src/app/forms/[id]/page.tsx`
  - Related component: `src/app/forms/[id]/form.tsx`

---

## API Routes

### Auth

- `/api/auth/[...nextauth]` → NextAuth handler
  - File: `src/app/api/auth/[...nextauth]/route.ts`
  - Auth config: `src/lib/auth.ts`

### Users

- `GET /api/users` → list users
  - File: `src/app/api/users/route.ts`

- `POST /api/users` → create user
  - File: `src/app/api/users/route.ts`

- `GET /api/users/[id]/photo` → profile photo
  - File: `src/app/api/users/[id]/photo/route.ts`

- `DELETE /api/users/[id]/children/[childId]` → delete a child for an admin user view
  - File: `src/app/api/users/[id]/children/[childId]/route.ts`

- `PATCH /api/profile` → update profile
  - File: `src/app/api/profile/route.ts`
  - Validation: `src/lib/validations/profile.ts`

### Auth/Register

- `POST /api/register` → create user
  - File: `src/app/api/register/route.ts`
  - Validation: `src/lib/validations/auth.ts`

### Activities

- `POST /api/activities` → create activity
  - File: `src/app/api/activities/route.ts`
  - Validation: `src/lib/validations/activity.ts`

- `PUT /api/activities/[id]` → update activity
  - File: `src/app/api/activities/[id]/route.ts`
  - Validation: `src/lib/validations/activity.ts`

- `GET /api/activities/[id]/checkout` → MercadoPago checkout redirect
  - File: `src/app/api/activities/[id]/checkout/route.ts`
  - Mercado Pago helper: `src/lib/mercadopago.ts`

- `POST /api/activities/cart/quote` → cart pricing quote for UI preview
  - File: `src/app/api/activities/cart/quote/route.ts`

- `POST /api/activities/[id]/days` → create activity day
  - File: `src/app/api/activities/[id]/days/route.ts`
  - Validation: `src/lib/validations/activity.ts`

- `POST /api/activities/[id]/groups` → create activity group
  - File: `src/app/api/activities/[id]/groups/route.ts`
  - Validation: `src/lib/validations/activity.ts`

- `PUT /api/activity-days/[dayId]` → update activity day
  - File: `src/app/api/activity-days/[dayId]/route.ts`
  - Validation: `src/lib/validations/activity.ts`

- `PATCH /api/activity-days/[dayId]/attendance` → confirm attendance for a day
  - File: `src/app/api/activity-days/[dayId]/attendance/route.ts`
  - Validation: `src/lib/validations/activity.ts`

- `POST /api/activity-groups/[groupId]/members` → join activity group
  - File: `src/app/api/activity-groups/[groupId]/members/route.ts`

- `DELETE /api/activity-groups/[groupId]/members` → leave activity group
  - File: `src/app/api/activity-groups/[groupId]/members/route.ts`

### Forms

- `GET /api/forms` → list forms
  - File: `src/app/api/forms/route.ts`
  - Validation: `src/lib/validations/form.ts`

- `POST /api/forms` → create form
  - File: `src/app/api/forms/route.ts`
  - Validation: `src/lib/validations/form.ts`

- `GET /api/forms/[id]/responses` → list responses
  - File: `src/app/api/forms/[id]/responses/route.ts`
  - Validation: `src/lib/validations/form.ts`

- `POST /api/forms/[id]/responses` → submit response
  - File: `src/app/api/forms/[id]/responses/route.ts`
  - Validation: `src/lib/validations/form.ts`

### Messaging

- `GET /api/messages` → conversations + unread counts
  - File: `src/app/api/messages/route.ts`
  - Related page: `src/app/chat/page.tsx`
  - Related client: `src/app/chat/chat-client.tsx`

- `GET /api/chat` → professor chat context with activities, groups, and shared participants
  - File: `src/app/api/chat/route.ts`

- `POST /api/messages/groups/[groupId]` → send one chat message to every user in an activity group
  - File: `src/app/api/messages/groups/[groupId]/route.ts`

### Accounting API

- `GET /api/accounting/movements` → list movements
  - File: `src/app/api/accounting/movements/route.ts`

- `POST /api/accounting/movements` → create movement
  - File: `src/app/api/accounting/movements/route.ts`

- `PUT /api/accounting/movements/[id]` → update movement
  - File: `src/app/api/accounting/movements/[id]/route.ts`

- `DELETE /api/accounting/movements/[id]` → delete movement
  - File: `src/app/api/accounting/movements/[id]/route.ts`

- `POST /api/accounting/movements/[id]/receipt` → upload receipt image
  - File: `src/app/api/accounting/movements/[id]/receipt/route.ts`

- `GET /api/accounting/reports` → aggregated report data
  - File: `src/app/api/accounting/reports/route.ts`

### Professor Payments

- `GET /api/professors/[id]/profile` → get professor banking/salary profile
  - File: `src/app/api/professors/[id]/profile/route.ts`

- `PUT /api/professors/[id]/profile` → upsert professor profile (COUNTER/ADMIN only)
  - File: `src/app/api/professors/[id]/profile/route.ts`

- `GET /api/professors/[id]/payments` → list professor payments
  - File: `src/app/api/professors/[id]/payments/route.ts`

- `POST /api/professors/[id]/payments` → create payment record (COUNTER/ADMIN only)
  - File: `src/app/api/professors/[id]/payments/route.ts`

- `PATCH /api/professor-payments/[paymentId]` → update payment status
  - File: `src/app/api/professor-payments/[paymentId]/route.ts`

- `DELETE /api/professor-payments/[paymentId]` → delete payment record
  - File: `src/app/api/professor-payments/[paymentId]/route.ts`

### Children

- `GET /api/children` → list children
  - File: `src/app/api/children/route.ts`
  - Validation: `src/lib/validations/child.ts`

- `POST /api/children` → create child
  - File: `src/app/api/children/route.ts`
  - Validation: `src/lib/validations/child.ts`

- `PUT /api/children/[id]` → update child (owner only)
  - File: `src/app/api/children/[id]/route.ts`
  - Validation: `src/lib/validations/child.ts`

### Mercado Pago

- `POST /api/mercadopago/notifications` → webhook
  - File: `src/app/api/mercadopago/notifications/route.ts`
  - Related admin page: `src/app/admin/notifications/page.tsx`
  - Mercado Pago helper: `src/lib/mercadopago.ts`

- `GET /api/mercadopago/notifications` → list notifications
  - File: `src/app/api/mercadopago/notifications/route.ts`
  - Related admin page: `src/app/admin/notifications/page.tsx`

---

## Shared Files

- Root layout
  - File: `src/app/layout.tsx`

- Navbar
  - File: `src/components/navbar.tsx`

- Footer
  - File: `src/components/footer.tsx`

- Global styles
  - File: `src/app/globals.css`

- Prisma schema
  - File: `prisma/schema.prisma`

- Prisma client
  - File: `src/lib/prisma.ts`

- Auth options
  - File: `src/lib/auth.ts`

- Mercado Pago config helpers
  - File: `src/lib/mercadopago.ts`

- i18n helpers
  - File: `src/lib/i18n.ts`

- Shared UI components
  - Folder: `src/components/ui/`

---

## Key Notes

- Activities are tied to payments via Mercado Pago checkout endpoint.
- Chat polling hits `/api/messages` periodically.
- Profile photo loads from `/api/users/[id]/photo`.
- Children are fetched when registering to activities.
- Activity registration can target the logged-in user or one of their children.

---

## How Agents Should Use This

Before coding:

1. Identify the feature area (activities, users, forms, etc).
2. Look up the route here.
3. Navigate directly to the corresponding file or folder.
4. Avoid searching blindly across the repo.
