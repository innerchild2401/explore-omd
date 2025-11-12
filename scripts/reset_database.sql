-- Reset application data while keeping the designated super admin user.
-- ⚠️  Review before running in production. Set the email address below.

DO $reset$
DECLARE
  super_admin_email text := 'superadmin@destexplore.eu'; -- TODO: update with the real super admin email
  super_admin_id uuid;
  table_to_truncate text;
  tables_to_truncate text[] := ARRAY[
    'email_sequence_logs',
    'reservation_activity_logs',
    'reservation_staff_ratings',
    'booking_issue_reports',
    'destination_ratings',
    'email_logs',
    'room_availability',
    'reservations',
    'reservation_payments',
    'room_rates',
    'rooms',
    'hotel_amenities',
    'hotels',
    'restaurant_images',
    'restaurants',
    'menu_items',
    'experience_images',
    'experience_time_slots',
    'experiences',
    'business_images',
    'business_areas',
    'businesses',
    'business_owners',
    'areas',
    'omd_amenities',
    'guest_profiles',
    'sections',
    'omds',
    'contact_inquiries',
    'storage_journal'
  ];
  reservations_trigger_exists boolean := false;
BEGIN
  -- Locate the super admin account in auth schema
  SELECT id
  INTO super_admin_id
  FROM auth.users
  WHERE email = super_admin_email;

  IF super_admin_id IS NULL THEN
    RAISE EXCEPTION 'Super admin email % not found in auth.users', super_admin_email;
  END IF;

  -- Clean up auth-related data
  DELETE FROM auth.sessions WHERE user_id <> super_admin_id;
  DELETE FROM auth.refresh_tokens WHERE user_id::uuid <> super_admin_id;
  DELETE FROM auth.mfa_amr_claims;
  DELETE FROM auth.mfa_factors WHERE user_id <> super_admin_id;
  DELETE FROM auth.identities WHERE user_id <> super_admin_id;

  -- Check for reservation availability trigger and disable if present
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.reservations'::regclass
      AND tgname = 'update_room_availability_on_reservation'
  ) INTO reservations_trigger_exists;

  IF reservations_trigger_exists THEN
    EXECUTE 'ALTER TABLE public.reservations DISABLE TRIGGER update_room_availability_on_reservation';
  END IF;

  -- Truncate tables if they exist, maintaining dependency order
  FOREACH table_to_truncate IN ARRAY tables_to_truncate LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = table_to_truncate
    ) THEN
      EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', table_to_truncate);
    END IF;
  END LOOP;

  -- Reset business owner sequence if it exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
      AND sequence_name = 'business_owners_owner_number_seq'
  ) THEN
    EXECUTE 'ALTER SEQUENCE public.business_owners_owner_number_seq RESTART WITH 100';
  END IF;

  -- Optional: clean Storage objects (requires supabase.storage admin privileges)
  -- DELETE FROM storage.objects;

  -- Clean up user profiles except super admin
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
  ) THEN
    DELETE FROM user_profiles WHERE id <> super_admin_id;

    INSERT INTO user_profiles (id, role, profile)
    SELECT super_admin_id, 'super_admin', jsonb_build_object('name', 'Super Admin')
    WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = super_admin_id);
  END IF;

  -- Re-enable reservation trigger if it was present
  IF reservations_trigger_exists THEN
    EXECUTE 'ALTER TABLE public.reservations ENABLE TRIGGER update_room_availability_on_reservation';
  END IF;
END;
$reset$ LANGUAGE plpgsql;


