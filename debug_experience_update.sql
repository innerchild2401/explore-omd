-- Debug: Try to manually update and see the exact error
-- Replace with your actual experience ID

-- First check current data
SELECT id, business_id, category, meeting_point, included, tags FROM experiences LIMIT 1;

-- Try a simple update first
-- This will help us isolate the issue
-- Run this one at a time and see which fails:

-- Test 1: Update basic fields
-- UPDATE experiences 
-- SET category = 'Updated Category'
-- WHERE id = 'YOUR-EXPERIENCE-ID-HERE';

-- Test 2: Update with meeting_point
-- UPDATE experiences 
-- SET meeting_point = '{"address": "test", "description": "test"}'
-- WHERE id = 'YOUR-EXPERIENCE-ID-HERE';

-- Test 3: Update with arrays
-- UPDATE experiences 
-- SET included = ARRAY['item1', 'item2']
-- WHERE id = 'YOUR-EXPERIENCE-ID-HERE';

-- If the above manual updates work, the issue is in the frontend code
-- If they fail with a specific error, that tells us the problem
