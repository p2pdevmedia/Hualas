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

### Auth

- `/login` → Login page
  - File: `src/app/login/page.tsx`

- `/register` → Register page
  - File: `src/app/register/page.tsx`

### Activities

- `/activities` → Admin activities list
  - File: `src/app/activities/page.tsx`
  - Related component: `src/components/activities-heading.tsx`

- `/activities/new` → Create activity
  - File: `src/app/activities/new/page.tsx`
  - Related form: `src/app/activities/new/form.tsx`

- `/activities/[id]` → Activity detail
  - File: `src/app/activities/[id]/page.tsx`
  - Related components:
    - `src/app/activities/[id]/register-button.tsx`
    - `src/app/activities/[id]/payment-handler.tsx`

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

- `/chat` → Internal chat
  - File: `src/app/chat/page.tsx`
  - Related client: `src/app/chat/chat-client.tsx`

- `/my-activities` → My activities for members and professors
  - File: `src/app/my-activities/page.tsx`

### Admin

- `/admin/users` → Users list
  - File: `src/app/admin/users/page.tsx`
  - Related component: `src/app/admin/users/users-list.tsx`

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

- `/admin/site` → Site settings (SUPER_ADMIN only)
  - File: `src/app/admin/site/page.tsx`
  - Related component: `src/app/admin/site/site-settings-form.tsx`

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

- `GET /api/users/[id]/photo` → profile photo
  - File: `src/app/api/users/[id]/photo/route.ts`

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

### Children

- `GET /api/children` → list children
  - File: `src/app/api/children/route.ts`
  - Validation: `src/lib/validations/child.ts`

- `POST /api/children` → create child
  - File: `src/app/api/children/route.ts`
  - Validation: `src/lib/validations/child.ts`

### Site Settings

- `GET /api/site-settings` → get branding
  - File: `src/app/api/site-settings/route.ts`
  - Related page: `src/app/admin/site/page.tsx`
  - Related component: `src/app/admin/site/site-settings-form.tsx`

- `POST /api/site-settings` → update branding
  - File: `src/app/api/site-settings/route.ts`
  - Related page: `src/app/admin/site/page.tsx`
  - Related component: `src/app/admin/site/site-settings-form.tsx`

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
