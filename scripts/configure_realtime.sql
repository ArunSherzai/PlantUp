-- Realtime Configuration for DM System
-- Run this in Supabase SQL Editor to ensure realtime is properly configured

-- 1. Add tables to realtime publication
DO $$
BEGIN
    -- Add dm_messages to publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE social_media_schema.dm_messages;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'dm_messages already in publication';
    END;

    -- Add dm_conversations to publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE social_media_schema.dm_conversations;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'dm_conversations already in publication';
    END;
END $$;

-- 2. Set replica identity to FULL (required for realtime)
ALTER TABLE social_media_schema.dm_messages REPLICA IDENTITY FULL;
ALTER TABLE social_media_schema.dm_conversations REPLICA IDENTITY FULL;

-- 3. Verify RLS policies exist for dm_messages
DO $$
BEGIN
    -- Check if SELECT policy exists for dm_messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'social_media_schema' 
        AND tablename = 'dm_messages' 
        AND policyname LIKE '%select%'
    ) THEN
        -- Create a basic SELECT policy if none exists
        CREATE POLICY "Users can view their own messages" 
        ON social_media_schema.dm_messages 
        FOR SELECT 
        USING (
            sender_id = auth.uid() OR 
            conversation_id IN (
                SELECT id FROM social_media_schema.dm_conversations 
                WHERE user_low = auth.uid() OR user_high = auth.uid()
            )
        );
        RAISE NOTICE 'Created SELECT policy for dm_messages';
    ELSE
        RAISE NOTICE 'SELECT policy already exists for dm_messages';
    END IF;
END $$;

-- 4. Verify RLS policies exist for dm_conversations
DO $$
BEGIN
    -- Check if SELECT policy exists for dm_conversations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'social_media_schema' 
        AND tablename = 'dm_conversations' 
        AND policyname LIKE '%select%'
    ) THEN
        -- Create a basic SELECT policy if none exists
        CREATE POLICY "Users can view their own conversations" 
        ON social_media_schema.dm_conversations 
        FOR SELECT 
        USING (user_low = auth.uid() OR user_high = auth.uid());
        RAISE NOTICE 'Created SELECT policy for dm_conversations';
    ELSE
        RAISE NOTICE 'SELECT policy already exists for dm_conversations';
    END IF;
END $$;

-- 5. Verify configuration
SELECT 
    'dm_messages' as table_name,
    count(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'social_media_schema' 
AND tablename = 'dm_messages'
UNION ALL
SELECT 
    'dm_conversations',
    count(*)
FROM pg_policies 
WHERE schemaname = 'social_media_schema' 
AND tablename = 'dm_conversations';

RAISE NOTICE 'Realtime configuration complete!';
