-- CreateTable
CREATE TABLE "PushAlertSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "PushAlertSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushAlertSubscription_subscriberId_key" ON "PushAlertSubscription"("subscriberId");

-- CreateIndex
CREATE INDEX "PushAlertSubscription_userId_idx" ON "PushAlertSubscription"("userId");

-- AddForeignKey
ALTER TABLE "PushAlertSubscription" ADD CONSTRAINT "PushAlertSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
