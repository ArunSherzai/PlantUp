-- Add SELECT policy to allow all authenticated users to read Player_stats
-- This is needed so users can see each other's levels in profiles and mentor lists

-- Enable RLS if not already enabled
ALTER TABLE gamification."Player_stats" ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to SELECT any row
CREATE POLICY "Allow authenticated users to read all player stats"
ON gamification."Player_stats"
FOR SELECT
TO authenticated
USING (true);
