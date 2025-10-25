-- =============================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- Migration: 07_auto_create_user_profile_trigger.sql
-- =============================================

-- This trigger automatically creates a user_profile when a new user signs up
-- This bypasses RLS issues during registration

-- First, drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if it doesn't exist
  INSERT INTO public.user_profiles (id, role, profile)
  VALUES (
    NEW.id,
    'visitor', -- Default role, will be updated during business registration or onboarding
    '{}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Now we can simplify the RLS policies since profile creation is automatic
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "OMD admins can update user profiles in their OMD" ON user_profiles;
DROP POLICY IF EXISTS "OMD admins can view user profiles in their OMD" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view their own profile" 
ON user_profiles FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Allow OMD admins to update user profiles in their OMD (for approval flow)
CREATE POLICY "OMD admins can update user profiles in their OMD" 
ON user_profiles FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.omd_id = user_profiles.omd_id
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- Allow OMD admins to view user profiles in their OMD
CREATE POLICY "OMD admins can view user profiles in their OMD" 
ON user_profiles FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.omd_id = user_profiles.omd_id
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- NOTE: We removed the INSERT policy since profiles are now auto-created by the trigger

