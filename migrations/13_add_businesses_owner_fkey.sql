-- =============================================
-- ADD FOREIGN KEY CONSTRAINT FOR BUSINESSES OWNER
-- Migration: 13_add_businesses_owner_fkey.sql
-- =============================================
--
-- Problem: The businesses table references owner_id but has no FK constraint
-- PostgREST cannot join businesses with user_profiles
--
-- Solution: Add foreign key constraint to user_profiles
-- =============================================

-- Drop existing constraint if it exists (from previous attempt)
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_owner_id_fkey;

-- Add foreign key constraint from businesses.owner_id to user_profiles.id
-- Note: user_profiles.id references auth.users.id, so this creates the proper chain
ALTER TABLE businesses
ADD CONSTRAINT businesses_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Verify the foreign key was created
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'businesses'
    AND kcu.column_name = 'owner_id';
