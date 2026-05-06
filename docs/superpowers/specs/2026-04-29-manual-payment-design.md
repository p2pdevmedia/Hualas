# Manual Payment Method Design Spec

**Date:** 2026-04-29  
**Feature:** Manual Bank Transfer Payment Method for Activity Checkout  
**Status:** Design Phase

## 1. Overview

Add a manual bank transfer payment method to the Hualas activity checkout flow. Customers upload proof of bank transfer during checkout, are instantly registered for the activity, and payment remains pending until an accountant manually validates the proof.

This feature integrates with the existing Payment infrastructure and accounting dashboard.

## 2. User Stories

### Customer Story

```
As a customer without Mercado Pago or preferring bank transfer,
I want to pay for activities via bank transfer and upload proof during checkout,
so I can complete activity registration without using digital wallets.

Acceptance Criteria:
- I can select "Manual Bank Transfer" payment method during checkout
- I can upload a screenshot/photo of bank confirmation
- I am instantly registered for the activity after upload
- I can check my payment status (pending approval, approved, or rejected)
```

### Accountant Story

```
As an accountant,
I want to review manual payment proofs and approve or reject them,
so I can validate that customers have actually transferred the money.

Acceptance Criteria:
- I can see all pending manual payments in accounting dashboard
- I can view proof file and payment details
- I can approve or reject with optional comments
- I can see full audit trail of all actions on a payment
```

## 3. Feature Scope

### In Scope

- Manual bank transfer payment method in checkout
- File upload for proof of payment (image file)
- Instant activity registration upon successful upload
- Accounting dashboard section for pending payments
- Approve/reject workflow with comments
- Audit trail showing all review history
- Payment status tracking (PENDING → APPROVED/REJECTED)

### Out of Scope

- Email notifications (can be added in future)
- Bulk approval of payments
- Custom fields for transaction details (bank name, ref number, etc.)
- Re-upload mechanism for rejected payments (customer can try checkout again)
- Partial refunds

## 4. Data Model

### Payment Model (Existing - No Schema Changes Required)

The existing Prisma `Payment` model already supports this:

```prisma
model Payment {
  id                String               @id @default(cuid())
  orderId           String
  provider          PaymentProvider      // MANUAL_TRANSFER already exists
  providerPaymentId String?
  amount            Int
  currency          String               @default("ARS")
  status            PaymentStatus        // PENDING, APPROVED, REJECTED
  paidAt            DateTime?
  payerName         String?
  payerEmail        String?
  receiptUrl        String?              // Stores proof file URL
  rawData           Json?
  order             Order                @relation(fields: [orderId], references: [id], onDelete: Restrict)
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
}
```

**New Field (Minor Extension):**
We'll extend the `rawData` JSON field to store:

```json
{
  "accountantComments": "Payment reference not visible, please resubmit",
  "reviewedAt": "2026-04-29T10:30:00Z",
  "reviewedBy": "admin@hualas.com",
  "previousRejections": 1
}
```

Alternatively, create a `PaymentReview` table if more sophisticated audit needs arise later. Starting with JSON is simpler.

## 5. User Flows

### 5.1 Customer Checkout Flow

```
1. Customer adds activity to cart
2. Navigates to checkout
3. System shows payment method options:
   - Mercado Pago (existing)
   - Manual Bank Transfer (NEW)
   - [Cash option if exists]
4. Customer selects "Manual Bank Transfer"
5. UI displays:
   - Payment amount summary
   - Bank transfer instructions (configurable by admin)
   - File upload input ("Upload proof of transfer")
6. Customer selects image file (PNG, JPG, PDF)
7. System validates:
   - File size < 5MB
   - File type is image or PDF
8. On submit:
   - Create Order
   - Create Payment (provider: MANUAL_TRANSFER, status: PENDING, receiptUrl: uploaded_file_path)
   - Create ActivityParticipant records (instant registration)
   - Show confirmation: "Payment submitted. You're registered! Accountant will verify within X hours"
   - Redirect to success page
```

### 5.2 Accountant Review Flow

```
1. Accountant navigates to /accounting/manual-payments
2. Sees list of pending payments:
   - Customer name
   - Activity name
   - Amount
   - Upload date
   - Status badge (Pending Review)
3. Clicks a payment to view details:
   - Proof file (image preview or PDF viewer)
   - Payment details (amount, date, customer info)
   - Full audit trail below (if exists)
4. Actions:
   a) Approve:
      - Click "Approve" button
      - System marks Payment status: APPROVED
      - Sets paidAt: now()
      - Removes from pending list
      - Toast confirmation

   b) Reject:
      - Click "Reject" button
      - Dialog opens for optional comment
      - Enters reason (e.g., "Amount doesn't match", "Blurry image, resubmit")
      - System marks Payment status: REJECTED
      - Stores comment in rawData.accountantComments
      - Updates rawData.previousRejections count
      - Removes from pending list but keeps audit trail visible
```

### 5.3 Customer Status Check

Customer can view payment status in profile or order history:

- Status: "Pending approval" (yellow badge)
- Status: "Approved" (green badge)
- Status: "Rejected" (red badge, can retry checkout)

## 6. Component Architecture

### New Components

#### 1. `PaymentMethodSelector` (Modify Existing)

- Location: `src/components/checkout/payment-method-selector.tsx`
- Add "Manual Bank Transfer" option alongside Mercado Pago
- Show/hide based on activity settings or global config

#### 2. `ManualPaymentForm` (New)

- Location: `src/components/checkout/manual-payment-form.tsx`
- Inputs:
  - File upload (proof image)
  - Display: bank transfer instructions
  - Display: payment amount
- Validation:
  - File selected
  - File size < 5MB
  - File type (image or PDF)
- Submit handling:
  - Upload file to Vercel Blob
  - Call API to create payment + order
  - Handle errors (network, file too large, etc.)

#### 3. `ManualPaymentsDashboard` (New)

- Location: `src/app/accounting/manual-payments/page.tsx`
- Display: table or list of pending payments
- Columns: Customer, Activity, Amount, Upload Date, Status
- Actions: Click to open detail modal

#### 4. `ManualPaymentDetail` (New)

- Location: `src/components/accounting/manual-payment-detail.tsx`
- Displays:
  - Proof file (image preview or PDF)
  - Payment details
  - Audit trail (timeline of actions)
- Actions:
  - Approve button
  - Reject button (with comment modal)

#### 5. `AuditTrail` (Reusable)

- Location: `src/components/audit-trail.tsx`
- Generic component to display timeline of events
- Used for: payment reviews, rejections, comments
- Display: "Reviewed by Admin on 2026-04-29 at 10:30 - Approved"
- Display: "Rejected by Admin on 2026-04-29 at 09:15 - Blurry image, resubmit clear proof"

### Modified Components

#### `CheckoutPage` (Extend)

- Location: `src/app/activities/[id]/checkout/page.tsx` (or similar)
- Add conditional rendering for manual payment form
- Pass payment method selection to checkout logic

#### `AccountingLayout` (Update Navigation)

- Location: `src/app/accounting/layout.tsx`
- Add link to "Manual Payments" in sidebar navigation

## 7. API Routes

### New Routes

#### `POST /api/accounting/manual-payments/[id]/approve`

- **Auth:** ADMIN or ACCOUNTANT role required
- **Params:** `id` = Payment ID
- **Request:** Empty or optional metadata
- **Response:** Updated Payment object
- **Logic:**
  - Find payment with given ID
  - Verify status is PENDING
  - Update status to APPROVED
  - Set paidAt to now
  - Update rawData with reviewer info
  - Return payment

#### `POST /api/accounting/manual-payments/[id]/reject`

- **Auth:** ADMIN or ACCOUNTANT role required
- **Params:** `id` = Payment ID
- **Request Body:**
  ```json
  {
    "comment": "Blurry image, please resubmit"
  }
  ```
- **Response:** Updated Payment object
- **Logic:**
  - Find payment with given ID
  - Verify status is PENDING
  - Update status to REJECTED
  - Store comment in rawData.accountantComments
  - Increment rawData.previousRejections
  - Update rawData with reviewer info
  - Return payment
  - Note: DO NOT unregister customer from activity

#### `GET /api/accounting/manual-payments`

- **Auth:** ADMIN or ACCOUNTANT role required
- **Query Params:**
  - `status` (optional): PENDING, APPROVED, REJECTED
  - `limit` (optional): default 50
  - `offset` (optional): default 0
- **Response:** List of payments with related order and customer info
- **Logic:**
  - Filter Payment records where provider = MANUAL_TRANSFER
  - Optionally filter by status
  - Include related Order and Customer data
  - Return paginated list

### Modified Routes

#### `POST /api/activities/[id]/checkout`

- **Extend existing logic:**
  - Add conditional handling for paymentMethod = MANUAL_TRANSFER
  - If manual transfer:
    - Create Order with status = PENDING_PAYMENT
    - Create Payment with provider = MANUAL_TRANSFER, receiptUrl = file_url
    - Create ActivityParticipant records (instant)
    - Return success response
  - Existing Mercado Pago logic unchanged

#### `GET /api/activities/[id]/checkout`

- **Extend existing logic:**
  - When returning checkout details, include available payment methods
  - Include bank transfer instructions if manual method is enabled

## 8. File Upload & Storage

### Strategy

Use **Vercel Blob** (already integrated in the project):

1. Customer selects file in form
2. Form validates locally (size, type)
3. On submit, upload to Vercel Blob with path: `/manual-payments/{date}/{paymentId}/{filename}`
4. Store returned blob URL in Payment.receiptUrl
5. Display via `<img>` tag (if image) or embedded PDF viewer

### File Constraints

- Max size: 5MB
- Accepted types: image/png, image/jpeg, application/pdf
- No virus scanning (optional enhancement later)

## 9. Audit Trail Implementation

### Data Structure

Store in `Payment.rawData` as nested object:

```json
{
  "reviews": [
    {
      "action": "uploaded",
      "by": "customer@email.com",
      "at": "2026-04-29T08:00:00Z"
    },
    {
      "action": "reviewed",
      "by": "admin@hualas.com",
      "at": "2026-04-29T10:30:00Z",
      "result": "rejected",
      "comment": "Image too blurry"
    },
    {
      "action": "reviewed",
      "by": "admin@hualas.com",
      "at": "2026-04-29T11:15:00Z",
      "result": "approved"
    }
  ]
}
```

### Display

Render as timeline in `AuditTrail` component:

- "Payment uploaded by customer on 2026-04-29 08:00"
- "Rejected by Admin on 2026-04-29 10:30 - Image too blurry"
- "Approved by Admin on 2026-04-29 11:15"

## 10. Configuration

### Bank Transfer Instructions

Store in a configurable setting (admin-editable in `/admin/settings` or hardcoded):

```
Example:
"Transfer to: Banco Hipotecario
Account: 1234567890
CUIT: 20-12345678-9
Concept: Club Hualas - [Activity Name]
"
```

### Enabled/Disabled Per Activity

Optional: Add a field to Activity model: `allowManualPayment: Boolean` (default true)
This allows admins to disable manual payments for specific activities if needed.

## 11. Error Handling

### Customer Errors

- File too large → "File must be under 5MB"
- Wrong file type → "Please upload an image (PNG, JPG) or PDF"
- Network error → "Upload failed. Please try again"
- Server error → "Payment creation failed. Please contact support"

### Accountant Errors

- Payment already approved/rejected → "This payment was already processed"
- Payment not found → "Payment record not found"
- Permission denied → Standard 403 response

## 12. Testing Strategy

### Unit Tests

- File validation (size, type)
- Payment status transitions
- Audit trail data structure
- API response validation

### Integration Tests

- Full checkout flow with manual payment
- Approve payment flow
- Reject payment with comment flow
- Verify activity registration happens instantly
- Verify payment status queries

### Manual Testing Checklist

- [ ] Upload proof image during checkout
- [ ] Verify instant activity registration
- [ ] View payment in accounting dashboard
- [ ] Approve payment, verify status updates
- [ ] Reject payment with comment
- [ ] View full audit trail
- [ ] File size validation works
- [ ] File type validation works

## 13. Security Considerations

- **File upload:** Validate type/size on server, use Vercel Blob's built-in security
- **Access control:** Only ADMIN/ACCOUNTANT can approve/reject
- **Audit trail:** Immutable log of who reviewed when
- **Data exposure:** Don't leak payment details to unauthorized users

## 14. Future Enhancements

- Email notifications when payment approved/rejected
- Bulk approve/reject actions
- Accountant comments visible to customer
- Automatic re-registration if payment rejected
- Integration with bank APIs for automated validation
- QR code scanning for bank confirmations

---

## Sign-Off

Design approved by: [User]  
Date: [Date]
