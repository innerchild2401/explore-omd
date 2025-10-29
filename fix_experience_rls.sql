-- Fix RLS policies for experiences table
-- This adds proper UPDATE policy that might be missing

-- Drop existing policies
DROP POLICY IF EXISTS "Experience owners can manage their experience" ON experiences;
DROP POLICY IF EXISTS "Experience owners can update their experience" ON experiences;

-- Recreate comprehensive policies
CREATE POLICY "Experience owners can manage their experience"
ON experiences
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = experiences.business_id
    AND b.owner_id = auth.uid()
  )
);

-- Explicit UPDATE policy for clarity
CREATE POLICY "Experience owners can update their experience"
ON experiences
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = experiences.business_id
    AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = experiences.business_id
    AND b.owner_id = auth.uid()
  )
);

-- Verify policies were created
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'experiences';
