-- ============================================
-- PlantUp: Follow Push Notifications (COMPLETE)
-- Run this ONCE in the Supabase SQL Editor
-- That's it. No CLI, no webhooks, no Edge Functions.
-- ============================================

-- 0. Enable pg_net extension (allows HTTP requests from SQL)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. Create push_tokens table
CREATE TABLE IF NOT EXISTS user_schema.push_tokens (
    user_id uuid NOT NULL REFERENCES user_schema."Users"(id) ON DELETE CASCADE,
    token text NOT NULL,
    platform text NOT NULL DEFAULT 'android',
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT push_tokens_pkey PRIMARY KEY (user_id)
);

-- 2. Enable RLS
ALTER TABLE user_schema.push_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Policies (safe re-run)
DROP POLICY IF EXISTS "Users can manage their own push token" ON user_schema.push_tokens;
DROP POLICY IF EXISTS "Service role can read all tokens" ON user_schema.push_tokens;

CREATE POLICY "Users can manage their own push token"
    ON user_schema.push_tokens FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can read all tokens"
    ON user_schema.push_tokens FOR SELECT
    USING (true);

-- 4. Enable Realtime for follows (for in-app notifications)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_media_schema."follows";
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'follows already in supabase_realtime';
END $$;

-- 5. Create the trigger function that sends Expo Push Notifications
CREATE OR REPLACE FUNCTION social_media_schema.notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
    v_push_token text;
    v_follower_name text;
BEGIN
    -- Get the followed user's push token
    SELECT token INTO v_push_token
    FROM user_schema.push_tokens
    WHERE user_id = NEW.following_id;

    -- No token = user has no device registered, skip
    IF v_push_token IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get the follower's username
    SELECT username INTO v_follower_name
    FROM user_schema."Users"
    WHERE id = NEW.follower_id;

    v_follower_name := COALESCE(v_follower_name, 'Someone');

    -- Send Expo Push Notification via pg_net
    PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Accept', 'application/json'
        ),
        body := jsonb_build_object(
            'to', v_push_token,
            'title', 'New Follower 🌱',
            'body', v_follower_name || ' is now following you!',
            'sound', 'advices_ping',
            'channelId', 'general',
            'data', jsonb_build_object(
                'category', 'follow',
                'followerId', NEW.follower_id,
                'followerName', v_follower_name
            )
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the trigger on the follows table
DROP TRIGGER IF EXISTS on_new_follow_notification ON social_media_schema."follows";

CREATE TRIGGER on_new_follow_notification
    AFTER INSERT ON social_media_schema."follows"
    FOR EACH ROW
    EXECUTE FUNCTION social_media_schema.notify_new_follower();

-- ============================================
-- DONE! Everything is set up.
-- When someone follows a user:
--   1. This trigger fires automatically
--   2. It looks up the push token + follower name
--   3. It sends an Expo Push Notification
-- ============================================
