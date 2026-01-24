-- ============================================
-- MENTOR REQUESTS TABLE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- Create mentor_requests table in social_media_schema
CREATE TABLE IF NOT EXISTS social_media_schema.mentor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES user_schema.Users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES user_schema.Users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sender_id, mentor_id) -- Prevent duplicate requests
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_requests_sender ON social_media_schema.mentor_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor ON social_media_schema.mentor_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_status ON social_media_schema.mentor_requests(status);

-- Enable Row Level Security
ALTER TABLE social_media_schema.mentor_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests (sent or received)
CREATE POLICY "Users can view their own requests" 
  ON social_media_schema.mentor_requests 
  FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = mentor_id);

-- Policy: Users can insert requests where they are the sender
CREATE POLICY "Users can insert requests" 
  ON social_media_schema.mentor_requests 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Mentors can update request status (accept/reject)
CREATE POLICY "Mentors can update request status" 
  ON social_media_schema.mentor_requests 
  FOR UPDATE 
  USING (auth.uid() = mentor_id);

-- Add table to realtime publication for live updates (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE social_media_schema.mentor_requests;
