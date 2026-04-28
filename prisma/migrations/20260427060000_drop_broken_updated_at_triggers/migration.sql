-- The legacy schema used a generic updated_at trigger on several tables.
-- Message, ConversationParticipant, and PasswordResetToken no longer have
-- an updatedAt column in the application schema, so those triggers now fail
-- whenever an update hits rows in those tables.

DROP TRIGGER IF EXISTS trg_message_updated_at ON "Message";
DROP TRIGGER IF EXISTS trg_conversation_participant_updated_at ON "ConversationParticipant";
DROP TRIGGER IF EXISTS trg_password_reset_token_updated_at ON "PasswordResetToken";
