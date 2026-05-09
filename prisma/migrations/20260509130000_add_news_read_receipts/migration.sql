CREATE TABLE "NewsReadReceipt" (
  "id" TEXT NOT NULL,
  "newsId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NewsReadReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsReadReceipt_newsId_userId_key" ON "NewsReadReceipt"("newsId", "userId");
CREATE INDEX "NewsReadReceipt_userId_readAt_idx" ON "NewsReadReceipt"("userId", "readAt");
CREATE INDEX "NewsReadReceipt_newsId_idx" ON "NewsReadReceipt"("newsId");

ALTER TABLE "NewsReadReceipt"
  ADD CONSTRAINT "NewsReadReceipt_newsId_fkey"
  FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NewsReadReceipt"
  ADD CONSTRAINT "NewsReadReceipt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
