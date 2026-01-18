-- 1. Add the missing column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'social_media_schema' 
                   AND table_name = 'dm_conversations' 
                   AND column_name = 'last_message_time') THEN
        ALTER TABLE social_media_schema.dm_conversations 
        ADD COLUMN last_message_time TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Define the Trigger Function
CREATE OR REPLACE FUNCTION social_media_schema.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE social_media_schema.dm_conversations
    SET 
        last_message_text = NEW.content,
        last_message_sender_id = NEW.sender_id,
        last_message_time = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. create the Trigger
DROP TRIGGER IF EXISTS on_new_message ON social_media_schema.dm_messages;

CREATE TRIGGER on_new_message
AFTER INSERT ON social_media_schema.dm_messages
FOR EACH ROW
EXECUTE FUNCTION social_media_schema.handle_new_message();
