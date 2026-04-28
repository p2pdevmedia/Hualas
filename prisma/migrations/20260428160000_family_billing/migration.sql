-- Create enums
CREATE TYPE "FamilyRelationship" AS ENUM ('CHILD','PARENT','RESPONSIBLE','OTHER');
CREATE TYPE "BillableConceptCode" AS ENUM ('SOCIAL_FEE','ACTIVITY_FEE','REGISTRATION_FEE','INSURANCE','DISCOUNT','SURCHARGE','OTHER');
CREATE TYPE "MonthlyChargeStatus" AS ENUM ('PENDING','PAID','CANCELLED','WAIVED');
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT','PENDING_PAYMENT','PAID','PARTIALLY_PAID','CANCELLED','EXPIRED');
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING','PAID','CANCELLED');
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL_TRANSFER','MERCADO_PAGO','CASH','OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED');

CREATE TABLE "FamilyGroup" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "responsibleUserId" TEXT,
  "responsibleName" TEXT NOT NULL,
  "responsibleEmail" TEXT NOT NULL,
  "responsiblePhone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "FamilyGroup_responsibleUserId_idx" ON "FamilyGroup"("responsibleUserId");
ALTER TABLE "FamilyGroup" ADD CONSTRAINT "FamilyGroup_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FamilyGroupMember" (
  "id" TEXT PRIMARY KEY,
  "familyGroupId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "relationship" "FamilyRelationship" NOT NULL DEFAULT 'CHILD',
  "isPaymentResponsible" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "FamilyGroupMember_familyGroupId_memberId_key" ON "FamilyGroupMember"("familyGroupId","memberId");
ALTER TABLE "FamilyGroupMember" ADD CONSTRAINT "FamilyGroupMember_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyGroupMember" ADD CONSTRAINT "FamilyGroupMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BillableConcept" (
  "id" TEXT PRIMARY KEY,
  "code" "BillableConceptCode" NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "defaultAmount" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Order" (
  "id" TEXT PRIMARY KEY,
  "familyGroupId" TEXT,
  "responsibleUserId" TEXT,
  "responsibleName" TEXT NOT NULL,
  "responsibleEmail" TEXT NOT NULL,
  "responsiblePhone" TEXT,
  "periodMonth" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" INTEGER NOT NULL DEFAULT 0,
  "discountTotal" INTEGER NOT NULL DEFAULT 0,
  "surchargeTotal" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OrderItem" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "memberId" TEXT,
  "activityId" TEXT,
  "billableConceptId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "periodMonth" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "OrderItem_unique_item_key" ON "OrderItem"("orderId","memberId","activityId","billableConceptId","periodMonth","periodYear");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_billableConceptId_fkey" FOREIGN KEY ("billableConceptId") REFERENCES "BillableConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Payment" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerPaymentId" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "payerName" TEXT,
  "payerEmail" TEXT,
  "receiptUrl" TEXT,
  "rawData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MemberMonthlyCharge" (
  "id" TEXT PRIMARY KEY,
  "memberId" TEXT NOT NULL,
  "periodMonth" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "concept" "BillableConceptCode" NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "MonthlyChargeStatus" NOT NULL DEFAULT 'PENDING',
  "orderItemId" TEXT,
  "paymentId" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MemberMonthlyCharge_member_period_concept_key" ON "MemberMonthlyCharge"("memberId","periodMonth","periodYear","concept");
ALTER TABLE "MemberMonthlyCharge" ADD CONSTRAINT "MemberMonthlyCharge_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberMonthlyCharge" ADD CONSTRAINT "MemberMonthlyCharge_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberMonthlyCharge" ADD CONSTRAINT "MemberMonthlyCharge_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
