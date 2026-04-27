-- Fix readAt column: remove NOT NULL and DEFAULT CURRENT_TIMESTAMP inherited from updatedAt rename.
-- Without this fix, every new message is immediately marked as "read", so unreadCount is always 0.
ALTER TABLE "Message" ALTER COLUMN "readAt" DROP DEFAULT;
ALTER TABLE "Message" ALTER COLUMN "readAt" DROP NOT NULL;

-- Reset existing messages that were auto-marked as read due to the bad default.
-- Only reset messages where readAt was set by the default (equal to createdAt),
-- preserving any messages that were intentionally marked as read.
UPDATE "Message" SET "readAt" = NULL WHERE "readAt" = "createdAt";
