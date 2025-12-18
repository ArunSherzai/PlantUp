-- 1. Create table for unclaimed rewards
CREATE TABLE IF NOT EXISTS gamification."User_unclaimed_rewards" (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    level int NOT NULL,
    reward_type text NOT NULL, -- 'COINS', 'BORDER', 'TITLE', 'ITEM'
    reward_id text, -- ID or Name of the item/border/title
    quantity int DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, level) -- One reward per level per user
);

-- RLS Policy for User_unclaimed_rewards
ALTER TABLE gamification."User_unclaimed_rewards" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own unclaimed rewards" ON gamification."User_unclaimed_rewards";
CREATE POLICY "Users can read own unclaimed rewards"
ON gamification."User_unclaimed_rewards"
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Function to handle level ups and assign pending rewards
CREATE OR REPLACE FUNCTION gamification.handle_level_up()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if level changed and increased
    IF NEW.level > OLD.level THEN
        
        -- Level 5: 500 Plant Coins
        IF NEW.level >= 5 AND OLD.level < 5 THEN
            INSERT INTO gamification."User_unclaimed_rewards" (user_id, level, reward_type, reward_id, quantity)
            VALUES (NEW.user_id, 5, 'COINS', NULL, 500)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Level 10: XP Booster (ID: xp_boost)
        IF NEW.level >= 10 AND OLD.level < 10 THEN
            INSERT INTO gamification."User_unclaimed_rewards" (user_id, level, reward_type, reward_id, quantity)
            VALUES (NEW.user_id, 10, 'ITEM', 'xp_boost', 1)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Level 20: Fire Border (UUID provided)
        IF NEW.level >= 20 AND OLD.level < 20 THEN
            INSERT INTO gamification."User_unclaimed_rewards" (user_id, level, reward_type, reward_id, quantity)
            VALUES (NEW.user_id, 20, 'BORDER', 'bb823b45-ac1c-4031-8c85-ba02c16c0f74', 1)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Level 30: Plant Sage Title (ID: 28)
        IF NEW.level >= 30 AND OLD.level < 30 THEN
            INSERT INTO gamification."User_unclaimed_rewards" (user_id, level, reward_type, reward_id, quantity)
            VALUES (NEW.user_id, 30, 'TITLE', '28', 1)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Level 40: Watering Can Skin
        IF NEW.level >= 40 AND OLD.level < 40 THEN
            INSERT INTO gamification."User_unclaimed_rewards" (user_id, level, reward_type, reward_id, quantity)
            VALUES (NEW.user_id, 40, 'ITEM', 'Watering Can Skin', 1)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Level 50: 500 Plant Coins
        IF NEW.level >= 50 AND OLD.level < 50 THEN
            INSERT INTO gamification."User_unclaimed_rewards" (user_id, level, reward_type, reward_id, quantity)
            VALUES (NEW.user_id, 50, 'COINS', NULL, 500)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Level 60: Animated Border
        IF NEW.level >= 60 AND OLD.level < 60 THEN
            INSERT INTO gamification."User_unclaimed_rewards" (user_id, level, reward_type, reward_id, quantity)
            VALUES (NEW.user_id, 60, 'BORDER', 'Animated Border', 1)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Level 75: Garden Deity Title (ID: 30)
        IF NEW.level >= 75 AND OLD.level < 75 THEN
            INSERT INTO gamification."User_unclaimed_rewards" (user_id, level, reward_type, reward_id, quantity)
            VALUES (NEW.user_id, 75, 'TITLE', '30', 1)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Level 100: Webshop Coupon
        IF NEW.level >= 100 AND OLD.level < 100 THEN
            INSERT INTO gamification."User_unclaimed_rewards" (user_id, level, reward_type, reward_id, quantity)
            VALUES (NEW.user_id, 100, 'ITEM', 'Webshop Coupon', 1)
            ON CONFLICT DO NOTHING;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger
DROP TRIGGER IF EXISTS on_level_up ON gamification."Player_stats";
CREATE TRIGGER on_level_up
AFTER UPDATE OF level ON gamification."Player_stats"
FOR EACH ROW
EXECUTE FUNCTION gamification.handle_level_up();

-- 4. RPC to claim reward
CREATE OR REPLACE FUNCTION gamification.claim_reward(p_level int)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reward RECORD;
    v_item_id bigint;
    v_border_id uuid;
    v_title_id int;
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();

    -- Get the reward info
    SELECT * INTO v_reward
    FROM gamification."User_unclaimed_rewards"
    WHERE user_id = v_user_id AND level = p_level
    FOR UPDATE; -- Lock row

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Reward not found or already claimed.');
    END IF;

    -- Grant Logic
    IF v_reward.reward_type = 'COINS' THEN
        UPDATE user_schema."Users"
        SET plant_coins = plant_coins + v_reward.quantity
        WHERE id = v_user_id;

    ELSIF v_reward.reward_type = 'BORDER' THEN
        -- Check if UUID
        IF v_reward.reward_id ~ '^[0-9a-fA-F-]{36}$' THEN
             v_border_id := v_reward.reward_id::uuid;
        ELSE
             SELECT id INTO v_border_id FROM gamification."Cosmetic_avatar_borders" WHERE name = v_reward.reward_id LIMIT 1;
        END IF;
        
        IF v_border_id IS NOT NULL THEN
            INSERT INTO gamification."User_owned_border" (user_id, border_id, is_equipped)
            VALUES (v_user_id, v_border_id, false)
            ON CONFLICT DO NOTHING;
        END IF;

    ELSIF v_reward.reward_type = 'TITLE' THEN
        -- Check if Integer
        IF v_reward.reward_id ~ '^[0-9]+$' THEN
             v_title_id := v_reward.reward_id::int;
        ELSE
             SELECT id INTO v_title_id FROM gamification."Titles" WHERE titlename = v_reward.reward_id LIMIT 1;
        END IF;

        IF v_title_id IS NOT NULL THEN
            INSERT INTO gamification."User_titles" (userid, titleid, selected)
            VALUES (v_user_id, v_title_id, false)
            ON CONFLICT DO NOTHING;
        END IF;

    ELSIF v_reward.reward_type = 'ITEM' THEN
        -- Check if Integer
        IF v_reward.reward_id ~ '^[0-9]+$' THEN
             v_item_id := v_reward.reward_id::bigint;
        ELSE
             SELECT id INTO v_item_id FROM gamification."Items" WHERE item_name = v_reward.reward_id LIMIT 1;
        END IF;

        IF v_item_id IS NOT NULL THEN
            INSERT INTO gamification."User_inventory" (id, user_id, quantity)
            VALUES (v_item_id, v_user_id, v_reward.quantity)
            ON CONFLICT (id, user_id) 
            DO UPDATE SET quantity = gamification."User_inventory".quantity + EXCLUDED.quantity;
        END IF;
    END IF;

    -- Delete from unclaimed
    DELETE FROM gamification."User_unclaimed_rewards"
    WHERE id = v_reward.id;

    RETURN json_build_object('success', true, 'message', 'Reward claimed!');
END;
$$;
