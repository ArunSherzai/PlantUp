-- 1. Enable Realtime for the tables in your custom schema
-- Use 'ADD TABLE' to ensure they are part of the publication
ALTER PUBLICATION supabase_realtime ADD TABLE social_media_schema.dm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE social_media_schema.dm_messages;

-- 2. (Optional but recommended) Ensure Replica Identity is Full or Default
-- This ensures the UPDATE event contains enough info
ALTER TABLE social_media_schema.dm_conversations REPLICA IDENTITY FULL;

-- 3. Verify RLS (Just in case)
-- Ensure authenticated users can SELECT their own conversations
-- (This policy usually exists, but confirming it's necessary for Realtime)
-- CREATE POLICY IF NOT EXISTS "Users can view their own conversations"
-- ON social_media_schema.dm_conversations
-- FOR SELECT
-- USING (auth.uid() = user_low OR auth.uid() = user_high);
