-- Check if the current user is the owner of Grand Hotel Caraiman
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.owner_id as current_owner_id,
    auth.uid() as logged_in_user_id,
    CASE 
        WHEN b.owner_id = auth.uid() THEN 'YES - You are the owner'
        ELSE 'NO - Different user'
    END as is_owner
FROM businesses b
WHERE b.slug = 'grand-hotel-caraiman' OR b.name ILIKE '%grand hotel caraiman%';

-- Also check which hotels are owned by the current user
SELECT 
    h.id as hotel_id,
    b.id as business_id,
    b.name as business_name,
    b.owner_id as owner_id,
    auth.uid() as current_user_id
FROM hotels h
JOIN businesses b ON b.id = h.business_id
WHERE b.owner_id = auth.uid();

