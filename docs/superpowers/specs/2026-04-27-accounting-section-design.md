# Accounting Section Design

**Date:** 2026-04-27
**Project:** Hualas Club Management System

---

## Overview

Add a `COUNTER` user role and a dedicated `/accounting` section for all club accounting needs. Only users with roles `COUNTER`, `ADMIN`, or `SUPER_ADMIN` can access this section.

---

## 1. Data Model

### Role enum update (`prisma/schema.prisma`)

Add `COUNTER` to the existing `Role` enum:

```prisma
enum Role {
  ADMIN
  COUNTER
  MEMBER
  PROFESSOR
  SUPER_ADMIN
}
```

### New model: `AccountingMovement`

```prisma
model AccountingMovement {
  id            String       @id @default(cuid())
  date          DateTime
  amount        Int                               // in centavos, same convention as MP payments
  type          MovementType
  category      String
  description   String
  receiptNumber String?
  receiptImage  String?                           // Vercel Blob URL
  createdById   String
  createdBy     User         @relation(fields: [createdById], references: [id])
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

enum MovementType {
  INCOME
  EXPENSE
}
```

### Predefined categories (in code, not DB enum)

`Cuotas`, `Actividades`, `Servicios`, `Equipamiento`, `Subsidios`, `Salarios`, `Eventos`, `Otros`

---

## 2. Routes

### Frontend routes

| Route | Description | File |
|-------|-------------|------|
| `/accounting` | Dashboard: balance summary + recent movements | `src/app/accounting/page.tsx` |
| `/accounting/movements` | Manual movements list | `src/app/accounting/movements/page.tsx` |
| `/accounting/movements/new` | Create movement form | `src/app/accounting/movements/new/page.tsx` |
| `/accounting/movements/[id]/edit` | Edit movement form | `src/app/accounting/movements/[id]/edit/page.tsx` |
| `/accounting/payments` | Mercado Pago payments (read-only) | `src/app/accounting/payments/page.tsx` |
| `/accounting/reports` | Reports by period/category + export | `src/app/accounting/reports/page.tsx` |

### API routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/accounting/movements` | List movements (with filters) |
| POST | `/api/accounting/movements` | Create movement |
| PUT | `/api/accounting/movements/[id]` | Update movement |
| DELETE | `/api/accounting/movements/[id]` | Delete movement |
| POST | `/api/accounting/movements/[id]/receipt` | Upload receipt image to Vercel Blob |
| GET | `/api/accounting/reports` | Aggregated data for reports |

---

## 3. Access Control

### Layout guard

`src/app/accounting/layout.tsx` — server component that checks session role. Redirects to `/` if role is not `COUNTER`, `ADMIN`, or `SUPER_ADMIN`.

### API guards

Every `/api/accounting/*` route validates the session role server-side. Returns 403 if unauthorized.

### Users list read-only for COUNTER

`/admin/users` — the `UsersList` component receives a `readOnly` prop. When `readOnly={true}`, edit/delete/reset-password actions are hidden. The `COUNTER` role gets this prop set to true.

`COUNTER` cannot access any other `/admin/*` routes.

### Navbar

Add a "Contaduría" link visible when `role === 'COUNTER' || isAdmin`.

---

## 4. UI per Page

### `/accounting` — Dashboard

- Four summary cards: Total income this month, Total expenses this month, Net balance, Total collected via MP
- Table of last 10 manual movements
- Table of last 5 MP payments
- Read-only, no actions

### `/accounting/movements` — Manual movements

- Filters: type (INCOME/EXPENSE), date range
- Table columns: Date, Type (green INCOME / red EXPENSE badge), Category, Description, Amount, Receipt (icon if image attached), Actions (edit/delete)
- "New movement" button in header

### `/accounting/movements/new` and `/edit` — Movement form

Fields:
- Date (date picker, required)
- Type (select: INCOME / EXPENSE, required)
- Category (select from predefined list, required)
- Description (textarea, required)
- Amount (number input in pesos, stored as centavos, required)
- Receipt number (text input, optional)
- Receipt image upload (Vercel Blob, same pattern as profile photo upload, optional)

### `/accounting/payments` — MP Payments

- Read-only table of `ActivityParticipant` records with receipt data
- Columns: Date, Activity, Participant name, Amount, Receipt number
- Filters: date range, activity name

### `/accounting/reports` — Reports

- Period selector: month/year or custom date range
- Summary cards: total income, total expenses, net balance
- Breakdown table by category with subtotals
- Export buttons: CSV (client-side) and PDF (client-side via jsPDF or similar lightweight library)

---

## 5. Files to Create or Modify

### New files
- `src/app/accounting/layout.tsx`
- `src/app/accounting/page.tsx`
- `src/app/accounting/movements/page.tsx`
- `src/app/accounting/movements/new/page.tsx`
- `src/app/accounting/movements/[id]/edit/page.tsx`
- `src/app/accounting/payments/page.tsx`
- `src/app/accounting/reports/page.tsx`
- `src/app/api/accounting/movements/route.ts`
- `src/app/api/accounting/movements/[id]/route.ts`
- `src/app/api/accounting/movements/[id]/receipt/route.ts`
- `src/app/api/accounting/reports/route.ts`
- `src/lib/validations/accounting.ts`
- `src/lib/accounting.ts` (shared categories constant + helpers)

### Modified files
- `prisma/schema.prisma` — add `COUNTER` role, `AccountingMovement` model, `MovementType` enum
- `src/components/navbar.tsx` — add Contaduría link
- `src/app/admin/users/users-list.tsx` — add `readOnly` prop
- `src/app/admin/users/page.tsx` — pass `readOnly` when session role is `COUNTER`
- `src/lib/i18n.ts` — add translation keys for accounting section
- `ROUTE_MAP.md` — document new routes

---

## 6. Dependencies

- No new major dependencies required
- PDF export: use `jspdf` + `jspdf-autotable` (lightweight, already common in club admin tools) — or defer to a later iteration and ship CSV only first
- Receipt image upload: reuse existing Vercel Blob pattern from profile photo

---

## 7. Out of Scope

- Accounting approval workflows
- Multi-currency support
- Integration with external accounting software
- Budget planning / forecasting
