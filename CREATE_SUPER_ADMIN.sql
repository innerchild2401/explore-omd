-- =============================================
-- CREATE SUPER ADMIN USER
-- =============================================
-- Run this in Supabase SQL Editor to set yourself as super admin
-- Replace 'your-email@example.com' with your actual email address

-- Step 1: Find your user ID from auth.users table
-- (Optional - you can also check your user ID in the Supabase Auth dashboard)
SELECT id, email 
FROM auth.users 
WHERE email = 'your-email@example.com';

-- Step 2: Update your user profile to set role as super_admin
-- Replace 'YOUR_USER_ID_HERE' with the ID from Step 1, or use the email directly
UPDATE user_profiles
SET role = 'super_admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Step 3: Verify the update
SELECT 
  up.id,
  au.email,
  up.role,
  up.omd_id
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.role = 'super_admin';

-- =============================================
-- ALTERNATIVE: Create super admin directly (if user doesn't exist)
-- =============================================
-- If you haven't signed up yet, first sign up through the app,
-- then run the UPDATE query above with your email address.

