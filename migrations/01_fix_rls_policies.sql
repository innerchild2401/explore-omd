-- Fix RLS policies for user profiles and signup flow

-- Drop existing user_profiles policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Allow users to read their own profile
CREATE POLICY "Users can view their own profile" 
ON user_profiles FOR SELECT 
USING (auth.uid() = id);

-- Allow users to insert their own profile (for onboarding)
CREATE POLICY "Users can insert their own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = id);

-- Allow authenticated users to create OMDs (for onboarding)
DROP POLICY IF EXISTS "Users can create OMDs" ON omds;
CREATE POLICY "Users can create OMDs" 
ON omds FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow OMD admins to update their own OMD
DROP POLICY IF EXISTS "OMD admins can update their OMD" ON omds;
CREATE POLICY "OMD admins can update their OMD" 
ON omds FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.omd_id = omds.id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- Allow authenticated users to create sections (for onboarding)
DROP POLICY IF EXISTS "Users can create sections" ON sections;
CREATE POLICY "Users can create sections" 
ON sections FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.omd_id = sections.omd_id
  )
);

-- Allow OMD admins to update their sections
DROP POLICY IF EXISTS "OMD admins can update sections" ON sections;
CREATE POLICY "OMD admins can update sections" 
ON sections FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.omd_id = sections.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- Allow OMD admins to view all sections (including hidden ones)
DROP POLICY IF EXISTS "OMD admins can view all sections" ON sections;
CREATE POLICY "OMD admins can view all sections" 
ON sections FOR SELECT 
USING (
  is_visible = true OR
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.omd_id = sections.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

