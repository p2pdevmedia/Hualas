-- CreateTable
CREATE TABLE "DbAuditLog" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "recordId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "args" JSONB,
    "userId" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DbAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DbAuditLog_model_idx" ON "DbAuditLog"("model");

-- CreateIndex
CREATE INDEX "DbAuditLog_action_idx" ON "DbAuditLog"("action");

-- CreateIndex
CREATE INDEX "DbAuditLog_createdAt_idx" ON "DbAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DbAuditLog_userId_idx" ON "DbAuditLog"("userId");

-- CreateIndex
CREATE INDEX "DbAuditLog_requestId_idx" ON "DbAuditLog"("requestId");
