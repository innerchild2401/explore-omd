-- Query to check experience table columns
-- Run this in Supabase SQL Editor to see what columns exist

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'experiences'
ORDER BY ordinal_position;

-- Also check if the new columns from migration 38 exist:
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'meeting_point') 
        THEN '✓ meeting_point EXISTS' 
        ELSE '✗ meeting_point MISSING' 
    END as meeting_point_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'included') 
        THEN '✓ included EXISTS' 
        ELSE '✗ included MISSING' 
    END as included_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'not_included') 
        THEN '✓ not_included EXISTS' 
        ELSE '✗ not_included MISSING' 
    END as not_included_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'important_info') 
        THEN '✓ important_info EXISTS' 
        ELSE '✗ important_info MISSING' 
    END as important_info_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'tags') 
        THEN '✓ tags EXISTS' 
        ELSE '✗ tags MISSING' 
    END as tags_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'price_from') 
        THEN '✓ price_from EXISTS' 
        ELSE '✗ price_from MISSING' 
    END as price_from_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'currency') 
        THEN '✓ currency EXISTS' 
        ELSE '✗ currency MISSING' 
    END as currency_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'cancellation_policy') 
        THEN '✓ cancellation_policy EXISTS' 
        ELSE '✗ cancellation_policy MISSING' 
    END as cancellation_policy_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'instant_confirmation') 
        THEN '✓ instant_confirmation EXISTS' 
        ELSE '✗ instant_confirmation MISSING' 
    END as instant_confirmation_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'wheelchair_accessible') 
        THEN '✓ wheelchair_accessible EXISTS' 
        ELSE '✗ wheelchair_accessible MISSING' 
    END as wheelchair_accessible_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'languages') 
        THEN '✓ languages EXISTS' 
        ELSE '✗ languages MISSING' 
    END as languages_status;
