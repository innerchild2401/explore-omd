-- =============================================
-- FIX FUNCTION PERMISSIONS
-- Migration: 10_fix_function_permissions.sql
-- =============================================

-- First, make sure the function exists and is in the public schema
-- Drop and recreate with proper permissions

DROP FUNCTION IF EXISTS public.register_business;

CREATE OR REPLACE FUNCTION public.register_business(
  p_omd_id UUID,
  p_owner_id UUID,
  p_business_type TEXT,
  p_business_name TEXT,
  p_description TEXT,
  p_contact_name TEXT,
  p_contact_phone TEXT,
  p_contact_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_slug TEXT;
BEGIN
  -- ⚠️ CRITICAL SECURITY CHECK: User can only register for themselves
  IF p_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You can only register businesses for yourself';
  END IF;

  -- Verify the user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_owner_id) THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  -- Verify the OMD exists
  IF NOT EXISTS (SELECT 1 FROM omds WHERE id = p_omd_id) THEN
    RAISE EXCEPTION 'Invalid destination';
  END IF;

  -- Validate business type
  IF p_business_type NOT IN ('hotel', 'restaurant', 'experience') THEN
    RAISE EXCEPTION 'Invalid business type';
  END IF;

  -- Generate slug from business name
  v_slug := lower(regexp_replace(p_business_name, '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  
  -- Ensure slug is not empty
  IF v_slug = '' THEN
    RAISE EXCEPTION 'Invalid business name';
  END IF;

  -- Insert business (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO businesses (
    omd_id,
    owner_id,
    type,
    name,
    slug,
    description,
    contact,
    status
  ) VALUES (
    p_omd_id,
    p_owner_id,
    p_business_type,
    p_business_name,
    v_slug,
    p_description,
    jsonb_build_object(
      'name', p_contact_name,
      'phone', p_contact_phone,
      'email', p_contact_email
    ),
    'pending'
  )
  RETURNING id INTO v_business_id;

  -- Update user profile to business_owner
  UPDATE user_profiles
  SET 
    role = 'business_owner',
    omd_id = p_omd_id,
    profile = jsonb_build_object(
      'status', 'pending',
      'contact_name', p_contact_name,
      'phone', p_contact_phone
    )
  WHERE id = p_owner_id;

  RETURN v_business_id;
END;
$$;

-- Grant permissions explicitly
ALTER FUNCTION public.register_business OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.register_business(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_business(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Ensure anon and public don't have access
REVOKE ALL ON FUNCTION public.register_business(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.register_business(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

-- Add comment
COMMENT ON FUNCTION public.register_business IS 
  'Securely registers a new business for authenticated users. 
   Validates owner_id matches auth.uid() to prevent unauthorized registrations.
   Bypasses RLS using SECURITY DEFINER but with strict validation.';

-- Verify permissions
SELECT 
  routine_name,
  routine_type,
  security_type,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'register_business';

