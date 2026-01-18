-- Enable RLS on the table (just in case it wasn't)
ALTER TABLE social_media_schema.dm_conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean slate (optional, but safer to avoid duplicates)
DROP POLICY IF EXISTS "Users can view their own conversations" ON social_media_schema.dm_conversations;
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON social_media_schema.dm_conversations;

-- Create the correct SELECT policy
CREATE POLICY "Users can view conversations they are part of"
ON social_media_schema.dm_conversations
FOR SELECT
USING (
    auth.uid() = user_low 
    OR 
    auth.uid() = user_high
);

-- Also ensure UPDATE permissions if you want the app to be able to mark as read, etc.
DROP POLICY IF EXISTS "Users can update their own conversations" ON social_media_schema.dm_conversations;
CREATE POLICY "Users can update their own conversations"
ON social_media_schema.dm_conversations
FOR UPDATE
USING (
    auth.uid() = user_low 
    OR 
    auth.uid() = user_high
);
