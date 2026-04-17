-- Fix to allow messaging mentors without being mutual followers
-- This replaces the existing get_or_create_dm_conversation RPC to bypass
-- the mutual followers check if there is an accepted mentor request between the two users.

CREATE OR REPLACE FUNCTION social_media_schema.get_or_create_dm_conversation(other_user UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv_id UUID;
  v_user_id UUID := auth.uid();
  v_low UUID;
  v_high UUID;
  v_mutual BOOLEAN;
  v_is_mentor_accepted BOOLEAN;
BEGIN
  IF v_user_id IS NULL OR other_user IS NULL THEN
    RAISE EXCEPTION 'Invalid users';
  END IF;

  IF v_user_id < other_user THEN
    v_low := v_user_id;
    v_high := other_user;
  ELSE
    v_low := other_user;
    v_high := v_user_id;
  END IF;

  -- 1. Check if conversation already exists
  SELECT id INTO v_conv_id
  FROM social_media_schema.dm_conversations
  WHERE user_low = v_low AND user_high = v_high
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- 2. Verify Mutual Followers
  SELECT EXISTS (
    SELECT 1 FROM social_media_schema.follows WHERE follower_id = v_user_id AND following_id = other_user
  ) AND EXISTS (
    SELECT 1 FROM social_media_schema.follows WHERE follower_id = other_user AND following_id = v_user_id
  ) INTO v_mutual;

  IF NOT v_mutual THEN
    -- 3. Bypass if there is an accepted mentor relationship
    SELECT EXISTS (
      SELECT 1 FROM social_media_schema.mentor_requests
      WHERE ((sender_id = v_user_id AND mentor_id = other_user)
         OR  (sender_id = other_user AND mentor_id = v_user_id))
      AND status = 'accepted'
    ) INTO v_is_mentor_accepted;

    IF NOT v_is_mentor_accepted THEN
      RAISE EXCEPTION 'DB_ERROR_P0001: Users are not mutual followers';
    END IF;
  END IF;

  -- 4. Create conversation
  INSERT INTO social_media_schema.dm_conversations (user_low, user_high)
  VALUES (v_low, v_high)
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;
