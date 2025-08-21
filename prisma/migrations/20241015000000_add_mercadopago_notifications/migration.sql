-- CreateTable
CREATE TABLE "MercadoPagoNotification" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MercadoPagoNotification_pkey" PRIMARY KEY ("id")
);
