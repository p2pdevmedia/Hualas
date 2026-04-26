# Hualas Route Map

This file describes main frontend routes and API endpoints.

Agents should check this before searching the codebase.

---

## Frontend Routes (Next.js App Router)

### Public

- `/` → Home page
- `/contact` → Contact page

### Auth

- `/login` → Login page
- `/register` → Register page

### Activities

- `/activities` → Admin activities list
- `/activities/new` → Create activity
- `/activities/[id]` → Activity detail
- `/activities/[id]/edit` → Edit activity

### User

- `/profile` → User profile
- `/chat` → Internal chat

### Admin

- `/admin/users` → Users list
- `/admin/forms` → Forms list
- `/admin/forms/new` → Create form
- `/admin/forms/[id]` → Form responses
- `/admin/notifications` → MercadoPago notifications
- `/admin/site` → Site settings (SUPER_ADMIN only)

### Forms (public/admin usage)

- `/forms/[id]` → Form display

---

## API Routes

### Auth

- `/api/auth/[...nextauth]` → NextAuth handler

### Users

- `GET /api/users` → list users
- `GET /api/users/[id]/photo` → profile photo
- `PATCH /api/profile` → update profile

### Auth/Register

- `POST /api/register` → create user

### Activities

- `POST /api/activities` → create activity
- `PUT /api/activities/[id]` → update activity
- `GET /api/activities/[id]/checkout` → MercadoPago checkout redirect

### Forms

- `GET /api/forms` → list forms
- `POST /api/forms` → create form
- `GET /api/forms/[id]/responses` → list responses
- `POST /api/forms/[id]/responses` → submit response

### Messaging

- `GET /api/messages` → conversations + unread counts

### Children

- `GET /api/children` → list children
- `POST /api/children` → create child

### Site Settings

- `GET /api/site-settings` → get branding
- `POST /api/site-settings` → update branding

### Mercado Pago

- `POST /api/mercadopago/notifications` → webhook
- `GET /api/mercadopago/notifications` → list notifications

---

## Key Notes

- Activities are tied to payments via Mercado Pago checkout endpoint.
- Chat polling hits `/api/messages` periodically.
- Profile photo loads from `/api/users/[id]/photo`.
- Children are fetched when registering to activities.

---

## How Agents Should Use This

Before coding:

1. Identify the feature area (activities, users, forms, etc).
2. Look up the route here.
3. Navigate directly to the corresponding file.
4. Avoid searching blindly across the repo.
