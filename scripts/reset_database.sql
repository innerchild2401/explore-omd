-- Reset application data while keeping the designated super admin user.
-- ⚠️  Review before running in production. Set the email address below.

DO $reset$
DECLARE
  super_admin_email text := 'superadmin@destexplore.eu'; -- TODO: update with the real super admin email
  super_admin_id uuid;
  truncate_stmt text;
BEGIN
  -- Locate the super admin account in auth schema
  SELECT id
  INTO super_admin_id
  FROM auth.users
  WHERE email = super_admin_email;

  IF super_admin_id IS NULL THEN
    RAISE EXCEPTION 'Super admin email % not found in auth.users', super_admin_email;
  END IF;

  -- Clean up all other auth-related entries
  DELETE FROM auth.sessions WHERE user_id <> super_admin_id;
  DELETE FROM auth.refresh_tokens WHERE user_id <> super_admin_id;
  DELETE FROM auth.mfa_amr_claims WHERE user_id <> super_admin_id;
  DELETE FROM auth.mfa_factors WHERE user_id <> super_admin_id;
  DELETE FROM auth.identities WHERE user_id <> super_admin_id;
  DELETE FROM user_profiles WHERE id <> super_admin_id;

  -- Re-create the super admin profile if missing
  INSERT INTO user_profiles (id, role, profile)
  SELECT super_admin_id, 'super_admin', jsonb_build_object('name', 'Super Admin')
  WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = super_admin_id);

  -- Truncate every application table in the public schema except user_profiles
  FOR truncate_stmt IN
    SELECT format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', tablename)
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('user_profiles')
  LOOP
    EXECUTE truncate_stmt;
  END LOOP;

  -- Optional: clean Storage objects (requires supabase.storage admin privileges)
  -- DELETE FROM storage.objects;

END;
$reset$ LANGUAGE plpgsql;


