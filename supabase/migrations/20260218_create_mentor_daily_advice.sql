-- ============================================================
-- Task 4 — Mentor daily advice cache table + hashing
-- ============================================================
-- This table caches one LLM-generated advice blob per user per
-- plant per day.  `input_hash` allows us to skip the LLM call
-- entirely when the DailyMentorInput hasn't changed.
-- ============================================================

-- Create the table in public schema (accessible by edge functions)
CREATE TABLE IF NOT EXISTS public.mentor_daily_advice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plant_id UUID NOT NULL,

    -- Calendar date (YYYY-MM-DD) for this advice entry
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- SHA-256 hex of the DailyMentorInput JSON (for cache invalidation)
    input_hash TEXT NOT NULL,

    -- The structured mentor response
    advice_json JSONB NOT NULL DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One advice row per user/plant/day
    CONSTRAINT unique_user_plant_date UNIQUE (user_id, plant_id, date)
);

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_mentor_advice_user_date
    ON public.mentor_daily_advice(user_id, date);

CREATE INDEX IF NOT EXISTS idx_mentor_advice_plant_date
    ON public.mentor_daily_advice(plant_id, date);

-- Enable RLS
ALTER TABLE public.mentor_daily_advice ENABLE ROW LEVEL SECURITY;

-- Users can read their own advice
CREATE POLICY "Users can view own mentor advice"
    ON public.mentor_daily_advice
    FOR SELECT
    USING (auth.uid() = user_id);

-- Edge functions insert/update on behalf of the user (uses service role),
-- but users can also insert their own
CREATE POLICY "Users can insert own mentor advice"
    ON public.mentor_daily_advice
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mentor advice"
    ON public.mentor_daily_advice
    FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- Auto-cleanup: remove entries older than 30 days
-- (run via pg_cron or manually)
-- ============================================================
-- DELETE FROM public.mentor_daily_advice
-- WHERE date < CURRENT_DATE - INTERVAL '30 days';
