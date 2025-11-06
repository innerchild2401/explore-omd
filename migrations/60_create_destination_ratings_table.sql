-- =============================================
-- Migration: Create destination_ratings table
-- =============================================
-- This migration creates the destination_ratings table
-- to store ratings for destinations (OMDs) from guests

CREATE TABLE IF NOT EXISTS destination_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Allow one rating per email per OMD (can update)
  UNIQUE(omd_id, email)
);

CREATE INDEX IF NOT EXISTS idx_destination_ratings_omd_id ON destination_ratings(omd_id);
CREATE INDEX IF NOT EXISTS idx_destination_ratings_created_at ON destination_ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_destination_ratings_rating ON destination_ratings(rating);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_destination_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_destination_ratings_updated_at
  BEFORE UPDATE ON destination_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_destination_ratings_updated_at();

-- Enable RLS
ALTER TABLE destination_ratings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create ratings
CREATE POLICY "Anyone can create destination ratings"
ON destination_ratings
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Allow OMD admins to view ratings for their OMD
CREATE POLICY "OMD admins can view ratings for their OMD"
ON destination_ratings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (
      role = 'super_admin'
      OR (role = 'omd_admin' AND omd_id = destination_ratings.omd_id)
    )
  )
);

-- Allow OMD admins to update ratings for their OMD
CREATE POLICY "OMD admins can update ratings for their OMD"
ON destination_ratings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (
      role = 'super_admin'
      OR (role = 'omd_admin' AND omd_id = destination_ratings.omd_id)
    )
  )
);

COMMENT ON TABLE destination_ratings IS 'Ratings and feedback for destinations (OMDs) from guests';
COMMENT ON COLUMN destination_ratings.omd_id IS 'The OMD (destination) being rated';
COMMENT ON COLUMN destination_ratings.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN destination_ratings.comment IS 'Optional comment/feedback from the guest';
COMMENT ON COLUMN destination_ratings.email IS 'Email of the guest providing the rating';

