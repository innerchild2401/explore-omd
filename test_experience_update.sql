-- Test query to manually update an experience and see what error occurs
-- Replace the ID with your actual experience ID

-- First, check what data exists
SELECT 
    id,
    business_id,
    category,
    price_from,
    currency,
    meeting_point,
    included,
    tags
FROM experiences
LIMIT 1;

-- Try to manually update (replace with actual ID)
-- UPDATE experiences 
-- SET 
--     category = 'Test Category',
--     price_from = 99.99,
--     currency = 'USD'
-- WHERE id = '6e64bc4c-da61-4715-9c47-c6e4a6f92ea9';

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'experiences';

-- Check if you have the right to update
SELECT 
    current_user,
    session_user;
