-- Run this in your Supabase SQL Editor to send a test message
-- It automatically picks the most recent conversation and sends a message from one of the participants.

DO $$
DECLARE
    v_conversation_id uuid;
    v_sender_id uuid;
BEGIN
    -- 1. Pick the most recently active conversation
    SELECT id, user_high INTO v_conversation_id, v_sender_id
    FROM social_media_schema.dm_conversations
    ORDER BY updated_at DESC
    LIMIT 1;

    -- 2. Insert a message if found
    IF v_conversation_id IS NOT NULL THEN
        INSERT INTO social_media_schema.dm_messages (conversation_id, sender_id, content, message_type)
        VALUES (v_conversation_id, v_sender_id, 'SQL Mock Message at ' || to_char(now(), 'HH24:MI:SS'), 'text');
        
        RAISE NOTICE 'Success! Sent message to conversation % as user %', v_conversation_id, v_sender_id;
    ELSE
        RAISE NOTICE 'No conversations found in social_media_schema.dm_conversations';
    END IF;
END $$;
