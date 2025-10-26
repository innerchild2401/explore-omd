-- Debug query to check user-hotel relationship
-- This will help identify why the RLS policy is blocking the reservation creation

-- Check if the current user owns the specific hotel
SELECT 
    'Current User Check' as check_type,
    auth.uid() as current_user_id,
    'dcbac38a-592a-424a-b59d-3a7fd0a429f8' as hotel_id;

-- Check the business record for this hotel
SELECT 
    'Business Check' as check_type,
    b.id as business_id,
    b.name as business_name,
    b.owner_id,
    b.omd_id,
    CASE 
        WHEN b.owner_id = auth.uid() THEN 'USER_IS_OWNER'
        ELSE 'USER_NOT_OWNER'
    END as ownership_status
FROM businesses b
WHERE b.id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8';

-- Check user profile
SELECT 
    'User Profile Check' as check_type,
    up.id,
    up.role,
    up.omd_id
FROM user_profiles up
WHERE up.id = auth.uid();

-- Test the exact RLS policy condition
SELECT 
    'RLS Policy Test' as check_type,
    EXISTS (
        SELECT 1
        FROM businesses b
        WHERE b.id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8'
        AND b.owner_id = auth.uid()
    ) as policy_allows_insert;
