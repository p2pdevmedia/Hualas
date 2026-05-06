-- CreateEnum
CREATE TYPE "NewsScope" AS ENUM ('CLUB', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "NewsMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NEWS_CREATED';

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scope" "NewsScope" NOT NULL,
    "activityId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsMedia" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "type" "NewsMediaType" NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "News_scope_createdAt_idx" ON "News"("scope", "createdAt");

-- CreateIndex
CREATE INDEX "News_activityId_createdAt_idx" ON "News"("activityId", "createdAt");

-- CreateIndex
CREATE INDEX "News_createdById_createdAt_idx" ON "News"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "NewsMedia_newsId_idx" ON "NewsMedia"("newsId");

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsMedia" ADD CONSTRAINT "NewsMedia_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;
