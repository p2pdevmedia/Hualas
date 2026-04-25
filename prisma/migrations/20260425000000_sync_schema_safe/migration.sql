-- DropConstraint
ALTER TABLE "ActivityParticipant" DROP CONSTRAINT IF EXISTS "ActivityParticipant_activityId_userId_key";

-- DropIndex
DROP INDEX IF EXISTS "idx_participant_conversation";

-- DropIndex
DROP INDEX IF EXISTS "idx_message_conversation";

-- DropIndex
DROP INDEX IF EXISTS "idx_message_sender";

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FormResponse" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MercadoPagoNotification" ALTER COLUMN "topic" DROP NOT NULL,
ALTER COLUMN "data" DROP NOT NULL;

-- Preserve existing message timestamps by renaming the column instead of dropping it.
-- The application schema expects `readAt`, and this keeps the stored values intact.
ALTER TABLE "Message" RENAME COLUMN "updatedAt" TO "readAt";

-- AlterTable
ALTER TABLE "SiteSetting" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "navbarColor" SET DATA TYPE TEXT,
ALTER COLUMN "footerColor" SET DATA TYPE TEXT,
ALTER COLUMN "backgroundColor" SET DATA TYPE TEXT;
DROP SEQUENCE IF EXISTS "SiteSetting_id_seq";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Rename the legacy unique object if it still exists under the old name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE c.conname = 'ConversationParticipant_user_convo_unique'
      AND t.relname = 'ConversationParticipant'
  ) THEN
    EXECUTE 'ALTER TABLE "ConversationParticipant" RENAME CONSTRAINT "ConversationParticipant_user_convo_unique" TO "ConversationParticipant_userId_conversationId_key"';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relname = 'ConversationParticipant_user_convo_unique'
  ) THEN
    EXECUTE 'ALTER INDEX "ConversationParticipant_user_convo_unique" RENAME TO "ConversationParticipant_userId_conversationId_key"';
  END IF;
END $$;
