-- Debug query with actual user ID
-- Check if user 6295c4da-27a8-4f43-b072-9758fe21bba7 owns hotel dcbac38a-592a-424a-b59d-3a7fd0a429f8

-- Check the business record for this hotel
SELECT 
    'Business Check' as check_type,
    b.id as business_id,
    b.name as business_name,
    b.owner_id,
    b.omd_id,
    '6295c4da-27a8-4f43-b072-9758fe21bba7' as current_user_id,
    CASE 
        WHEN b.owner_id = '6295c4da-27a8-4f43-b072-9758fe21bba7' THEN 'USER_IS_OWNER'
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
WHERE up.id = '6295c4da-27a8-4f43-b072-9758fe21bba7';

-- Test the exact RLS policy condition
SELECT 
    'RLS Policy Test' as check_type,
    EXISTS (
        SELECT 1
        FROM businesses b
        WHERE b.id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8'
        AND b.owner_id = '6295c4da-27a8-4f43-b072-9758fe21bba7'
    ) as policy_allows_insert;
