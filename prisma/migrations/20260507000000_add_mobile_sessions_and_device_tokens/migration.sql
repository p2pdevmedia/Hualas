-- Mobile sessions and APNs device token storage
CREATE TABLE "MobileSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "appRole" "Role" NOT NULL,
  "platform" TEXT,
  "deviceName" TEXT,
  "deviceModel" TEXT,
  "appVersion" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileSession_tokenHash_key" ON "MobileSession"("tokenHash");
CREATE INDEX "MobileSession_userId_appRole_idx" ON "MobileSession"("userId", "appRole");
CREATE INDEX "MobileSession_expiresAt_revokedAt_idx" ON "MobileSession"("expiresAt", "revokedAt");

ALTER TABLE "MobileSession"
  ADD CONSTRAINT "MobileSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MobileDeviceToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'iOS',
  "bundleId" TEXT,
  "environment" TEXT,
  "deviceName" TEXT,
  "deviceModel" TEXT,
  "appVersion" TEXT,
  "sessionId" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MobileDeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileDeviceToken_token_key" ON "MobileDeviceToken"("token");
CREATE INDEX "MobileDeviceToken_userId_idx" ON "MobileDeviceToken"("userId");
CREATE INDEX "MobileDeviceToken_platform_environment_idx" ON "MobileDeviceToken"("platform", "environment");

ALTER TABLE "MobileDeviceToken"
  ADD CONSTRAINT "MobileDeviceToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
