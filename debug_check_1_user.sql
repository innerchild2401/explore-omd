-- Check 1: Current User ID
SELECT 
    'Current User Check' as check_type,
    auth.uid() as current_user_id,
    'dcbac38a-592a-424a-b59d-3a7fd0a429f8' as hotel_id;
