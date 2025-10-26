-- Debug query to check user's relationship to hotel
-- Replace 'YOUR_USER_ID' with the actual user ID from auth.uid()
-- Replace 'YOUR_HOTEL_ID' with the actual hotel ID being used

-- Check if user owns the hotel
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.owner_id,
    auth.uid() as current_user_id,
    CASE 
        WHEN b.owner_id = auth.uid() THEN 'OWNER'
        ELSE 'NOT_OWNER'
    END as ownership_status
FROM businesses b
WHERE b.id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8' -- Replace with actual hotel_id
AND b.owner_id = auth.uid();

-- Check user's profile
SELECT 
    id,
    role,
    omd_id
FROM user_profiles
WHERE id = auth.uid();
