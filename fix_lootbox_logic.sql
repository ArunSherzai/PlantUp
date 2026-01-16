CREATE OR REPLACE FUNCTION gamification.buy_lootbox(p_cost int)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_current_coins int;
    v_border_id uuid;
    v_border_name text;
BEGIN
    v_user_id := auth.uid();

    -- 1. Check Balance
    SELECT plant_coins INTO v_current_coins
    FROM user_schema."Users"
    WHERE id = v_user_id;

    IF v_current_coins < p_cost THEN
        RETURN json_build_object('success', false, 'message', 'Not enough coins!');
    END IF;

    -- 2. Deduct Coins
    UPDATE user_schema."Users"
    SET plant_coins = plant_coins - p_cost
    WHERE id = v_user_id;

    -- 3. Determine Reward
    -- Always try to find a border (100% chance for item if available)
    
    -- Select a random border that the user does NOT own
    SELECT id, name INTO v_border_id, v_border_name
    FROM gamification."Cosmetic_avatar_borders"
    WHERE id NOT IN (
        SELECT border_id 
        FROM gamification."User_owned_border" 
        WHERE user_id = v_user_id
    )
    ORDER BY random()
    LIMIT 1;

    -- If we found an unowned border
    IF v_border_id IS NOT NULL THEN
        INSERT INTO gamification."User_owned_border" (user_id, border_id, is_equipped)
        VALUES (v_user_id, v_border_id, false);

        RETURN json_build_object(
            'success', true, 
            'message', 'You unlocked: ' || v_border_name || '!', 
            'rewardType', 'border', 
            'rewardValue', v_border_id::text
        );
    ELSE
        -- Fallback: All borders owned -> Give 500 Coins (Refund)
        UPDATE user_schema."Users"
        SET plant_coins = plant_coins + 500
        WHERE id = v_user_id;

        RETURN json_build_object(
            'success', true, 
            'message', 'Duplicate! Converted to 500 coins.', 
            'rewardType', 'coins', 
            'rewardValue', '500'
        );
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in buy_lootbox: %', SQLERRM;
    RETURN json_build_object('success', false, 'message', 'Transaction failed: ' || SQLERRM);
END;
$$;
