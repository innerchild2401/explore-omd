-- =============================================
-- ALTERNATIVE: Database Function for Business Registration
-- Migration: 09_business_registration_function.sql
-- =============================================
-- This is a backup solution if RLS continues to block registration
-- The function runs with SECURITY DEFINER to bypass RLS

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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_business_id UUID;
  v_slug TEXT;
BEGIN
  -- Verify the user exists and matches the owner_id
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_owner_id) THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  -- Verify the OMD exists
  IF NOT EXISTS (SELECT 1 FROM omds WHERE id = p_omd_id) THEN
    RAISE EXCEPTION 'Invalid destination';
  END IF;

  -- Generate slug from business name
  v_slug := lower(regexp_replace(p_business_name, '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.register_business TO authenticated;

-- Comment
COMMENT ON FUNCTION public.register_business IS 
  'Registers a new business for a user. Bypasses RLS using SECURITY DEFINER.';

