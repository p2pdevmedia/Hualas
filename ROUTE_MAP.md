# Hualas Route Map

This file maps the current Next.js App Router surface.

Last audited: 2026-06-03.

Use this before changing pages or API routes. If you add, move, or delete a
route, update this file in the same change.

---

## Frontend Routes

### Public

- `/` -> `src/app/page.tsx`
  - Public home. Shows public content plus role-aware member/professor context
    when logged in.
- `/android` -> `src/app/android/page.tsx`
  - Android APK download page. Static APK: `public/downloads/hualas-mobile.apk`.
- `/contact` -> `src/app/contact/page.tsx`
  - Related component: `src/app/contact/contact-form.tsx`.
- `/habitantes-de-la-tierra` -> `src/app/habitantes-de-la-tierra/page.tsx`
  - Public visual story page for `Pequeños habitantes de la tierra`.
  - Uses the local PDF asset
    `public/documentos/pequenos-habitantes-de-la-tierra.pdf` and the
    client-side book viewer in
    `src/app/habitantes-de-la-tierra/documentary-book-viewer.tsx`.
  - The viewer renders one page at a time, loads all PDF pages into its cache
    when the document opens, and lets visitors click the right or left half of
    the page to advance or go back.
- `/documental-pequenos-habitantes` -> `src/app/documental-pequenos-habitantes/page.tsx`
  - Permanent redirect to `/habitantes-de-la-tierra` for older links.
- `/faq` -> `src/app/faq/page.tsx`
  - Public/help page with role, activity, and payment flow guidance.
- `/privacy-policy` -> `src/app/privacy-policy/page.tsx`
  - Privacy policy page.
- `/professors/[id]` -> `src/app/professors/[id]/page.tsx`
  - Public professor profile.
  - Does not expose professor banking data, CUIT, private notes, or private
    observations.

### Auth

- `/login` -> `src/app/login/page.tsx`
- `/register` -> `src/app/register/page.tsx`
- `/forgot-password` -> `src/app/forgot-password/page.tsx`
- `/reset-password` -> `src/app/reset-password/page.tsx`
- `/post-login` -> `src/app/post-login/page.tsx`
  - Role-aware landing redirect after login.

### Activities

- `/activities` -> `src/app/activities/page.tsx`
  - Admin activity list.
- `/activities/new` -> `src/app/activities/new/page.tsx`
  - Admin create activity form.
- `/activities/[id]` -> `src/app/activities/[id]/page.tsx`
  - Activity detail used from admin/professor/member contexts.
  - Professor views are scoped to assigned groups/days and do not expose
    participants outside the professor's assignment.
- `/activities/[id]/edit` -> `src/app/activities/[id]/edit/page.tsx`
  - Admin edit activity form.
- `/activities/join/[id]` -> `src/app/activities/join/[id]/page.tsx`
  - Public/member join landing page.
- `/activities/cart` -> `src/app/activities/cart/page.tsx`
  - Member activity cart. Quotes new inscriptions, pending social fees, and
    current-month payments owed for active `ANNUAL` activity participants.
- `/activities/[id]/groups/[groupId]` -> `src/app/activities/[id]/groups/[groupId]/page.tsx`
  - Activity group detail and member management.
- `/activities/[id]/groups/[groupId]/edit` -> `src/app/activities/[id]/groups/[groupId]/edit/page.tsx`
  - Edit activity group.
- `/activities/[id]/participants/[participantId]` -> `src/app/activities/[id]/participants/[participantId]/page.tsx`
  - Participant detail.
- `/activities/[id]/days/[dayId]` -> `src/app/activities/[id]/days/[dayId]/page.tsx`
  - Activity day/session detail.
- `/activities/[id]/days/[dayId]/attendance` -> `src/app/activities/[id]/days/[dayId]/attendance/page.tsx`
  - Attendance view.
- `/activities/[id]/days/[dayId]/descripcion` -> `src/app/activities/[id]/days/[dayId]/descripcion/page.tsx`
  - Activity day description.
- `/activities/[id]/days/[dayId]/edit` -> `src/app/activities/[id]/days/[dayId]/edit/page.tsx`
  - Admin edit activity day.
- `/activities/[id]/days/[dayId]/informacion` -> `src/app/activities/[id]/days/[dayId]/informacion/page.tsx`
  - Activity day information.
- `/activities/[id]/days/[dayId]/observaciones` -> `src/app/activities/[id]/days/[dayId]/observaciones/page.tsx`
  - Activity day observations/returns.

### News

- `/news` -> `src/app/news/page.tsx`
  - Institutional news feed for members, professors, and admins.
  - Related components:
    - `src/app/news/create-news-form.tsx`
    - `src/app/news/news-list.tsx`

### Member / User

- `/profile` -> `src/app/profile/page.tsx`
  - Related components:
    - `src/app/profile/form.tsx`
    - `src/app/profile/profile-photo-upload.tsx`
- `/profile/children` -> `src/app/profile/children/page.tsx`
- `/profile/children/new` -> `src/app/profile/children/new/page.tsx`
- `/profile/children/[childId]` -> `src/app/profile/children/[childId]/page.tsx`
- `/profile/children/[childId]/edit` -> `src/app/profile/children/[childId]/edit/page.tsx`
  - Loads the child record only; it must not serialize the owning `User` row to
    the client form.
- `/profile/children/add-tutor` -> `src/app/profile/children/add-tutor/page.tsx`
- `/profile/payments` -> `src/app/profile/payments/page.tsx`
  - Member payment history.
- `/profile/notifications` -> `src/app/profile/notifications/page.tsx`
  - Notification preferences.
- `/profile/pickup-notices` -> `src/app/profile/pickup-notices/page.tsx`
- `/profile/pickup-notices/new` -> `src/app/profile/pickup-notices/new/page.tsx`
- `/profile/pickup-notices/[noticeId]/edit` -> `src/app/profile/pickup-notices/[noticeId]/edit/page.tsx`
- `/my-activities` -> `src/app/my-activities/page.tsx`
  - Member and professor activity view.
- `/my-payments` -> `src/app/my-payments/page.tsx`
  - Professor self-view for banking data, invoice upload/status, and payment history.
  - Invoice upload requires selecting one assigned activity; when there is only
    one assigned activity, it is preselected.
  - Invoice upload accepts PDFs and mobile gallery images, including HEIC/HEIF
    photos from iOS and Samsung/Android JPEGs that report `image/jpg` or a
    generic file content type.
  - The API validates invoice magic bytes before storing the private Blob.
- `/chat` -> `src/app/chat/page.tsx`
  - Related client: `src/app/chat/chat-client.tsx`.
- `/notifications` -> `src/app/notifications/page.tsx`
  - Full in-app notification inbox.

### Professor

- `/professor/students` -> `src/app/professor/students/page.tsx`
  - Professor group/student overview. Admin can also inspect this view.
- `/professor/students/child/[childId]` -> `src/app/professor/students/child/[childId]/page.tsx`
  - Professor child/student detail.
- `/professor/students/parent/[userId]` -> `src/app/professor/students/parent/[userId]/page.tsx`
  - Professor parent/tutor detail.

### Accounting

All `/accounting/*` pages are guarded by `src/app/accounting/layout.tsx` and
require active `COUNTER` or `ADMIN`.

- `/accounting` -> `src/app/accounting/page.tsx`
  - Accounting dashboard summary. The unified movements table includes manual
    movements, manual payments, Mercado Pago payments, and transferred
    professor invoices via `src/lib/accounting-dashboard.ts`.
- `/accounting/social-fee` -> `src/app/accounting/social-fee/page.tsx`
- `/accounting/debt-by-family` -> `src/app/accounting/debt-by-family/page.tsx`
- `/accounting/manual-payments` -> `src/app/accounting/manual-payments/page.tsx`
- `/accounting/movements` -> `src/app/accounting/movements/page.tsx`
- `/accounting/movements/new` -> `src/app/accounting/movements/new/page.tsx`
- `/accounting/movements/[id]/edit` -> `src/app/accounting/movements/[id]/edit/page.tsx`
- `/accounting/movements/activities` -> `src/app/accounting/movements/activities/page.tsx`
  - Activity cashbox. Shows participant income, manual activity expenses, and
    professor honorarios linked through professor invoice/payment activity.
  - The expenses tab renders clickable receipt links that open the file in a
    new browser tab via `src/components/accounting/receipt-preview-link.tsx`
    when a receipt or professor invoice file exists.
- `/accounting/payments` -> `src/app/accounting/payments/page.tsx`
- `/accounting/professors` -> `src/app/accounting/professors/page.tsx`
  - Professor accounting list. Search uses
    `src/app/accounting/professors/professor-search.tsx` to update the `q`
    query param as each letter is typed, refreshing results without requiring a
    submit button.
- `/accounting/professors/[id]` -> `src/app/accounting/professors/[id]/page.tsx`
  - Professor banking profile, invoice approval, and transfer tracking.
  - Invoice approval is opened from each pending invoice status in the invoice
    table, not as a standalone form above payment history.
  - Multiple pending invoices can be approved for the same professor and
    month; the invoice is the unique approval unit, not the month.
  - Professor invoice approval copies the invoice activity onto the professor
    payment so transferred honorarios can be reconciled by activity.
  - Renders banking/profile data even if professor invoice migrations are still
    pending; invoice actions show a migration warning until the DB is updated.
- `/accounting/reports` -> `src/app/accounting/reports/page.tsx`

### Admin

Most `/admin/*` pages are guarded by `src/app/admin/layout.tsx` and require
active `ADMIN`. `SUPER_ADMIN` is a capability boost inside the admin profile.

- `/admin/users` -> `src/app/admin/users/page.tsx`
- `/admin/users/new` -> `src/app/admin/users/new/page.tsx`
- `/admin/users/[id]` -> `src/app/admin/users/[id]/page.tsx`
- `/admin/users/[id]/view` -> `src/app/admin/users/[id]/view/page.tsx`
- `/admin/users/[id]/add-tutor` -> `src/app/admin/users/[id]/add-tutor/page.tsx`
- `/admin/users/[id]/child-enrollment` -> `src/app/admin/users/[id]/child-enrollment/page.tsx`
- `/admin/users/[id]/children/[childId]/view` -> `src/app/admin/users/[id]/children/[childId]/view/page.tsx`
- `/admin/users/[id]/children/[childId]/edit` -> `src/app/admin/users/[id]/children/[childId]/edit/page.tsx`
- `/admin/users/[id]/merge-children` -> `src/app/admin/users/[id]/merge-children/page.tsx`
- `/admin/forms` -> `src/app/admin/forms/page.tsx`
- `/admin/forms/new` -> `src/app/admin/forms/new/page.tsx`
- `/admin/forms/[id]` -> `src/app/admin/forms/[id]/page.tsx`
- `/admin/forms/[id]/edit` -> `src/app/admin/forms/[id]/edit/page.tsx`
- `/admin/notifications` -> `src/app/admin/notifications/page.tsx`
  - `SUPER_ADMIN` capability only.
- `/admin/audit-log` -> `src/app/admin/audit-log/page.tsx`
  - `SUPER_ADMIN` capability only.

### Forms

- `/forms/[id]` -> `src/app/forms/[id]/page.tsx`
  - Admin-guarded form display and response submission UI.

---

## API Routes

Methods below come from the current `route.ts` exports.

### Auth API

- `GET, POST` `/api/auth/[...nextauth]` -> `src/app/api/auth/[...nextauth]/route.ts`
- `GET` `/api/auth/post-login-redirect` -> `src/app/api/auth/post-login-redirect/route.ts`
- `POST` `/api/auth/request-password-reset` -> `src/app/api/auth/request-password-reset/route.ts`
- `POST` `/api/auth/reset-password` -> `src/app/api/auth/reset-password/route.ts`
- `POST` `/api/register` -> `src/app/api/register/route.ts`

### Users / Profile / Family API

- `GET, POST` `/api/users` -> `src/app/api/users/route.ts`
- `PATCH, DELETE` `/api/users/[id]` -> `src/app/api/users/[id]/route.ts`
- `GET, POST` `/api/users/[id]/children` -> `src/app/api/users/[id]/children/route.ts`
- `PUT, DELETE` `/api/users/[id]/children/[childId]` -> `src/app/api/users/[id]/children/[childId]/route.ts`
- `GET` `/api/users/[id]/photo` -> `src/app/api/users/[id]/photo/route.ts`
  - Private Blob proxy. Access is limited to self, active admin/super-admin,
    authorized family context, or a professor assigned to that user/child.
- `POST` `/api/users/[id]/reset-password` -> `src/app/api/users/[id]/reset-password/route.ts`
- `PATCH` `/api/profile` -> `src/app/api/profile/route.ts`
- `POST` `/api/profile/active-role` -> `src/app/api/profile/active-role/route.ts`
- `GET, POST` `/api/profile/photo` -> `src/app/api/profile/photo/route.ts`
  - Uploads are private Blob writes with image magic-byte validation and rate
    limiting.
- `GET, POST` `/api/children` -> `src/app/api/children/route.ts`
- `PUT, DELETE` `/api/children/[id]` -> `src/app/api/children/[id]/route.ts`
- `GET, POST` `/api/children/[id]/photo` -> `src/app/api/children/[id]/photo/route.ts`
  - Uploads are private Blob writes with image magic-byte validation and rate
    limiting.
- `GET` `/api/family-groups/[id]` -> `src/app/api/family-groups/[id]/route.ts`
- `GET, POST, DELETE` `/api/family-groups/[id]/members` -> `src/app/api/family-groups/[id]/members/route.ts`

### Activities API

- `POST` `/api/activities` -> `src/app/api/activities/route.ts`
- `PUT, DELETE` `/api/activities/[id]` -> `src/app/api/activities/[id]/route.ts`
- `GET, POST` `/api/activities/[id]/checkout` -> `src/app/api/activities/[id]/checkout/route.ts`
  - Manual-transfer POST creates a pending payment/order without active
    participant access. Both Mercado Pago and manual approval use canonical
    configured URLs/helpers and checkout rate limiting.
- `POST` `/api/activities/[id]/payment` -> `src/app/api/activities/[id]/payment/route.ts`
  - Mercado Pago return confirmation uses the shared transactional enrollment
    finalizer and re-checks capacity before activating access.
- `POST` `/api/activities/[id]/withdraw` -> `src/app/api/activities/[id]/withdraw/route.ts`
- `GET, POST, DELETE` `/api/activities/[id]/image` -> `src/app/api/activities/[id]/image/route.ts`
  - Upload validates image magic bytes and rejects spoofed/SVG content.
- `GET, POST` `/api/activities/[id]/media` -> `src/app/api/activities/[id]/media/route.ts`
  - Image uploads validate magic bytes before Blob writes; video uploads keep
    MIME/size checks.
- `GET, DELETE` `/api/activities/[id]/media/[mediaId]` -> `src/app/api/activities/[id]/media/[mediaId]/route.ts`
- `POST` `/api/activities/[id]/days` -> `src/app/api/activities/[id]/days/route.ts`
- `POST` `/api/activities/[id]/days/[dayId]/reports` -> `src/app/api/activities/[id]/days/[dayId]/reports/route.ts`
- `POST` `/api/activities/[id]/groups` -> `src/app/api/activities/[id]/groups/route.ts`
- `POST` `/api/activities/cart/available` -> `src/app/api/activities/cart/available/route.ts`
- `POST` `/api/activities/cart/quote` -> `src/app/api/activities/cart/quote/route.ts`
  - Returns `activityMonthlyPaymentLines` and
    `totalActivityMonthlyPaymentAmount` when active annual activity
    participants owe the current month.
- `POST` `/api/activities/cart/checkout` -> `src/app/api/activities/cart/checkout/route.ts`
  - Persists quoted monthly activity payment lines through Mercado Pago
    metadata or manual transfer raw data so approval registers the correct
    `ActivityParticipantPayment` period.
  - Manual-transfer checkout stays pending without active participant access.
- `PUT, PATCH, DELETE` `/api/activity-days/[dayId]` -> `src/app/api/activity-days/[dayId]/route.ts`
- `PATCH` `/api/activity-days/[dayId]/attendance` -> `src/app/api/activity-days/[dayId]/attendance/route.ts`
- `PATCH` `/api/activity-days/[dayId]/cancel` -> `src/app/api/activity-days/[dayId]/cancel/route.ts`
- `GET, POST` `/api/activity-days/[dayId]/pickup-notices` -> `src/app/api/activity-days/[dayId]/pickup-notices/route.ts`
  - Group-specific days require the child/user to have an active participant in
    the same activity group.
- `PATCH, DELETE` `/api/activity-groups/[groupId]` -> `src/app/api/activity-groups/[groupId]/route.ts`
- `POST, DELETE` `/api/activity-groups/[groupId]/members` -> `src/app/api/activity-groups/[groupId]/members/route.ts`

### Mobile API

Native iPhone and Android clients use bearer-token auth through these
`/api/mobile/*` routes.

- `POST` `/api/mobile/auth/login` -> `src/app/api/mobile/auth/login/route.ts`
- `POST` `/api/mobile/auth/logout` -> `src/app/api/mobile/auth/logout/route.ts`
- `POST` `/api/mobile/auth/switch-role` -> `src/app/api/mobile/auth/switch-role/route.ts`
- `GET` `/api/mobile/me` -> `src/app/api/mobile/me/route.ts`
- `GET` `/api/mobile/home` -> `src/app/api/mobile/home/route.ts`
- `GET, PATCH` `/api/mobile/profile` -> `src/app/api/mobile/profile/route.ts`
- `GET, POST` `/api/mobile/profile/photo` -> `src/app/api/mobile/profile/photo/route.ts`
  - Upload validates image magic bytes and rate-limits writes.
- `GET, POST` `/api/mobile/children` -> `src/app/api/mobile/children/route.ts`
- `GET, PUT` `/api/mobile/children/[id]` -> `src/app/api/mobile/children/[id]/route.ts`
- `GET, POST` `/api/mobile/children/[id]/photo` -> `src/app/api/mobile/children/[id]/photo/route.ts`
  - Upload validates image magic bytes and rate-limits writes.
- `GET, POST, DELETE` `/api/mobile/family-groups/current/members` -> `src/app/api/mobile/family-groups/current/members/route.ts`
- `GET` `/api/mobile/activities` -> `src/app/api/mobile/activities/route.ts`
- `GET` `/api/mobile/activities/[dayId]` -> `src/app/api/mobile/activities/[dayId]/route.ts`
- `GET` `/api/mobile/activities/available` -> `src/app/api/mobile/activities/available/route.ts`
- `POST` `/api/mobile/activities/cart/quote` -> `src/app/api/mobile/activities/cart/quote/route.ts`
  - Includes pending `activityMonthlyPaymentLines` for current-month annual
    activity debt.
- `POST` `/api/mobile/activities/cart/checkout` -> `src/app/api/mobile/activities/cart/checkout/route.ts`
  - Carries monthly activity payment metadata into the shared checkout flow.
  - Manual-transfer checkout remains pending without active access until
    accounting approval.
- `GET` `/api/mobile/news` -> `src/app/api/mobile/news/route.ts`
- `POST` `/api/mobile/news/read` -> `src/app/api/mobile/news/read/route.ts`
- `GET` `/api/mobile/messages` -> `src/app/api/mobile/messages/route.ts`
- `GET, POST` `/api/mobile/messages/[userId]` -> `src/app/api/mobile/messages/[userId]/route.ts`
- `GET` `/api/mobile/chat/contacts` -> `src/app/api/mobile/chat/contacts/route.ts`
- `GET, PATCH` `/api/mobile/notifications` -> `src/app/api/mobile/notifications/route.ts`
- `PATCH` `/api/mobile/notifications/[id]` -> `src/app/api/mobile/notifications/[id]/route.ts`
- `POST` `/api/mobile/devices` -> `src/app/api/mobile/devices/route.ts`
- `GET` `/api/mobile/payments` -> `src/app/api/mobile/payments/route.ts`
- `GET, POST` `/api/mobile/pickup-notices` -> `src/app/api/mobile/pickup-notices/route.ts`
- `GET` `/api/mobile/pickup-notices/options` -> `src/app/api/mobile/pickup-notices/options/route.ts`
  - Group-specific activity days are returned only when the child/user is an
    active participant of the same group.
- `PUT, DELETE` `/api/mobile/pickup-notices/[noticeId]` -> `src/app/api/mobile/pickup-notices/[noticeId]/route.ts`
- `GET` `/api/mobile/professor/attendance` -> `src/app/api/mobile/professor/attendance/route.ts`
- `GET, PATCH` `/api/mobile/professor/attendance/[dayId]` -> `src/app/api/mobile/professor/attendance/[dayId]/route.ts`
- `GET` `/api/mobile/professor/groups` -> `src/app/api/mobile/professor/groups/route.ts`
- `GET` `/api/mobile/professor/groups/[groupId]` -> `src/app/api/mobile/professor/groups/[groupId]/route.ts`
- `GET` `/api/mobile/professor/students` -> `src/app/api/mobile/professor/students/route.ts`
  - Optional `groupId` filters stay inside the professor's assigned group
    scope; professor cannot use arbitrary group IDs.

### Messaging API

- `GET` `/api/messages` -> `src/app/api/messages/route.ts`
- `GET, POST` `/api/messages/[userId]` -> `src/app/api/messages/[userId]/route.ts`
- `POST` `/api/messages/groups/[groupId]` -> `src/app/api/messages/groups/[groupId]/route.ts`
- `GET` `/api/chat` -> `src/app/api/chat/route.ts`

### News API

- `POST` `/api/news` -> `src/app/api/news/route.ts`
  - Image media validates magic bytes before Blob writes; video media keeps
    MIME/size checks.
- `PUT` `/api/news/[id]` -> `src/app/api/news/[id]/route.ts`
- `GET` `/api/news/[id]/media` -> `src/app/api/news/[id]/media/route.ts`
- `POST` `/api/news/read` -> `src/app/api/news/read/route.ts`

### Notifications API

- `GET, PATCH` `/api/notifications` -> `src/app/api/notifications/route.ts`
- `PATCH` `/api/notifications/[id]` -> `src/app/api/notifications/[id]/route.ts`
- `GET, PUT` `/api/notifications/preferences` -> `src/app/api/notifications/preferences/route.ts`
- `POST` `/api/notifications/subscriptions` -> `src/app/api/notifications/subscriptions/route.ts`
- `DELETE` `/api/notifications/subscriptions/[id]` -> `src/app/api/notifications/subscriptions/[id]/route.ts`

### Forms API

- `GET, POST` `/api/forms` -> `src/app/api/forms/route.ts`
- `GET, PUT, DELETE` `/api/forms/[id]` -> `src/app/api/forms/[id]/route.ts`
- `GET, POST` `/api/forms/[id]/responses` -> `src/app/api/forms/[id]/responses/route.ts`

### Accounting / Payment API

- `GET, POST` `/api/accounting/movements` -> `src/app/api/accounting/movements/route.ts`
- `PUT, DELETE` `/api/accounting/movements/[id]` -> `src/app/api/accounting/movements/[id]/route.ts`
- `GET, POST` `/api/accounting/movements/[id]/receipt` -> `src/app/api/accounting/movements/[id]/receipt/route.ts`
  - Receipt upload validates image magic bytes before Blob writes.
- `GET` `/api/accounting/reports` -> `src/app/api/accounting/reports/route.ts`
- `GET, PATCH` `/api/accounting/social-fee` -> `src/app/api/accounting/social-fee/route.ts`
- `GET, POST` `/api/accounting/month-close` -> `src/app/api/accounting/month-close/route.ts`
- `GET` `/api/accounting/manual-payments` -> `src/app/api/accounting/manual-payments/route.ts`
- `POST` `/api/accounting/manual-payments/[id]/approve` -> `src/app/api/accounting/manual-payments/[id]/approve/route.ts`
  - Approval activates participants through
    `src/lib/services/activity-enrollment-finalization.ts`.
- `POST` `/api/accounting/manual-payments/[id]/reject` -> `src/app/api/accounting/manual-payments/[id]/reject/route.ts`
  - Rejection cancels the linked order and order items.
- `GET` `/api/accounting/manual-payments/[id]/receipt` -> `src/app/api/accounting/manual-payments/[id]/receipt/route.ts`
- `GET` `/api/billing/concepts` -> `src/app/api/billing/concepts/route.ts`
- `POST` `/api/orders/draft` -> `src/app/api/orders/draft/route.ts`
- `POST` `/api/orders/[id]/items` -> `src/app/api/orders/[id]/items/route.ts`
- `POST` `/api/orders/[id]/confirm` -> `src/app/api/orders/[id]/confirm/route.ts`
- `POST` `/api/orders/[id]/cancel` -> `src/app/api/orders/[id]/cancel/route.ts`
- `POST` `/api/orders/[id]/payments` -> `src/app/api/orders/[id]/payments/route.ts`
- `POST` `/api/payments/[id]/approve` -> `src/app/api/payments/[id]/approve/route.ts`
- `POST` `/api/payments/[id]/reject` -> `src/app/api/payments/[id]/reject/route.ts`

### Professor Payments API

- `GET, PUT` `/api/professors/[id]/profile` -> `src/app/api/professors/[id]/profile/route.ts`
- `GET, POST` `/api/professors/[id]/payments` -> `src/app/api/professors/[id]/payments/route.ts`
  - `POST` approves a pending professor invoice and creates the linked payment record.
- `GET, POST` `/api/professors/[id]/invoices` -> `src/app/api/professors/[id]/invoices/route.ts`
  - Professor invoice uploads require `BLOB_READ_WRITE_TOKEN` for private Vercel Blob storage.
  - Upload validates PDF/JPG/PNG/WebP/HEIC/HEIF magic bytes.
- `PATCH, DELETE` `/api/professor-payments/[paymentId]` -> `src/app/api/professor-payments/[paymentId]/route.ts`
  - `PATCH` marks an approved professor payment as transferred and syncs the invoice status.
- `DELETE` `/api/professor-invoices/[invoiceId]` -> `src/app/api/professor-invoices/[invoiceId]/route.ts`
- `GET` `/api/professor-invoices/[invoiceId]/file` -> `src/app/api/professor-invoices/[invoiceId]/file/route.ts`

### Pickup Notices API

- `PUT, DELETE` `/api/pickup-notices/[noticeId]` -> `src/app/api/pickup-notices/[noticeId]/route.ts`
- `POST` `/api/pickup-notices/[noticeId]/acknowledgments` -> `src/app/api/pickup-notices/[noticeId]/acknowledgments/route.ts`

### Admin API

- `GET` `/api/admin/audit-log` -> `src/app/api/admin/audit-log/route.ts`
- `POST` `/api/admin/users/[id]/tutors` -> `src/app/api/admin/users/[id]/tutors/route.ts`
- `POST` `/api/admin/users/[id]/merge-children` -> `src/app/api/admin/users/[id]/merge-children/route.ts`

### Mercado Pago API

- `GET, POST` `/api/mercadopago/notifications` -> `src/app/api/mercadopago/notifications/route.ts`
  - Webhook signature is required. Approved payments activate participants
    through the shared transactional enrollment finalizer and re-check capacity.

---

## Native App Code

- iPhone app: `iphone/HualasMobile/`
  - Setup and workflow: `iphone/README.md`
  - Uses `/api/mobile/*`.
- Android app: `android/`
  - Setup and workflow: `android/README.md`
  - Backend contract: `android/API_CONTRACT.md`
  - Uses `/api/mobile/*`.

---

## Shared Files

- Root layout: `src/app/layout.tsx`
- Navbar: `src/components/navbar.tsx`
- Footer: `src/components/footer.tsx`
- Providers: `src/components/providers.tsx`
- Global styles: `src/app/globals.css`
- Prisma schema: `prisma/schema.prisma`
- Prisma client: `src/lib/prisma.ts`
- Auth options: `src/lib/auth.ts`
- Role helpers: `src/lib/roles.ts`
- Route/page guards: `src/lib/role-guards.tsx`
- Mercado Pago helpers: `src/lib/mercadopago.ts`
- Mercado Pago webhook logic: `src/lib/mercadopago-webhooks.ts`
- Paid enrollment finalizer: `src/lib/services/activity-enrollment-finalization.ts`
- Professor access scopes: `src/lib/professor-access.ts`
- User photo access scopes: `src/lib/user-photo-access.ts`
- Security helpers: `src/lib/security/`
- Mobile auth helpers: `src/lib/mobile-auth.ts`
- Notifications: `src/lib/notifications/`
- Shared UI components: `src/components/ui/`

---

## Access Notes

- Public users can use public pages and auth flows.
- Logged-in `MEMBER` users can access profile, children/family tools,
  notifications, chat, activity cart/checkout, payments, pickup notices, news,
  and `/my-activities`.
- Logged-in `PROFESSOR` users can access `/my-activities`,
  `/professor/students`, assigned groups, attendance-related activity day
  views, professor payments, chat, news, and notifications.
  Professor data is group/day scoped through `ActivityGroupProfessor` for
  grouped records and `ActivityProfessor` for ungrouped records.
- `COUNTER` and active `ADMIN` users can access `/accounting/*`.
- Active `ADMIN` users can access `/admin/*`, activities management, forms, and
  users.
- `SUPER_ADMIN` is a capability used inside active `ADMIN`; it gates admin
  notifications and audit log.
- Role switching uses `User.activeRole` plus `UserRoleAssignment` capabilities.
- Cookie-authenticated unsafe `/api/*` mutations require same-origin `Origin`;
  `/api/mobile/*` uses bearer-token auth.

## Maintenance

This map is part of the implementation contract. Whenever a task adds or
changes a page, API endpoint, role-specific flow, native app surface, guard,
shared feature area, or important integration, update this file in the same
change.

Future agents should be able to discover that functionality exists from this
map without scanning the whole app first.

To check this map against the filesystem, compare:

- frontend pages: `find src/app -type f -name page.tsx | sort`
- API routes: `find src/app/api -type f -name route.ts | sort`
- exported methods: inspect `export function GET/POST/PUT/PATCH/DELETE` in each
  route file.
