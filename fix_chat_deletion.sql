-- Allow users to delete conversations they are part of
-- This fixes the issue where client-side deletion fails due to missing permissions
CREATE POLICY "Users can delete their own conversations"
ON social_media_schema.dm_conversations
FOR DELETE
TO authenticated
USING (
    auth.uid() = user_low 
    OR 
    auth.uid() = user_high
);
