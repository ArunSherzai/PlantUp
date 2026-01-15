-- ============================================
-- Virtual Plants Table
-- ============================================
-- Stores the virtual plant for each user.
-- The plant's visual appearance is determined by:
--   1. seed: Random number used to generate the plant's unique structure
--   2. pot_type: The style of pot the plant sits in
--   3. Growth level: Derived from the user's level (not stored here)
-- ============================================

CREATE TABLE IF NOT EXISTS public.virtual_plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Plant generation seed (determines the unique plant structure/colors)
    seed INTEGER NOT NULL DEFAULT floor(random() * 100000)::INTEGER,
    
    -- Pot type for display
    pot_type TEXT NOT NULL DEFAULT 'PotStandard' CHECK (pot_type IN ('PotStandard', 'PotB', 'PotEgg')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure one plant per user
    CONSTRAINT unique_user_plant UNIQUE (user_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_virtual_plants_user_id ON public.virtual_plants(user_id);

-- Enable Row Level Security
ALTER TABLE public.virtual_plants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own plant
CREATE POLICY "Users can view own plant"
    ON public.virtual_plants
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own plant
CREATE POLICY "Users can create own plant"
    ON public.virtual_plants
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own plant
CREATE POLICY "Users can update own plant"
    ON public.virtual_plants
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own plant
CREATE POLICY "Users can delete own plant"
    ON public.virtual_plants
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_virtual_plants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_virtual_plants_updated_at
    BEFORE UPDATE ON public.virtual_plants
    FOR EACH ROW
    EXECUTE FUNCTION update_virtual_plants_updated_at();

-- ============================================
-- Usage Notes:
-- ============================================
-- To render a plant, fetch:
--   1. virtual_plants.seed (for plant structure)
--   2. virtual_plants.pot_type (for pot display)
--   3. User's level from gamification.User_stats or similar
--      (growth = user_level, clamped to 0-100)
-- ============================================
