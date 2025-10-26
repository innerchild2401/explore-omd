-- Check 3: User Profile
SELECT 
    'User Profile Check' as check_type,
    up.id,
    up.role,
    up.omd_id
FROM user_profiles up
WHERE up.id = auth.uid();
