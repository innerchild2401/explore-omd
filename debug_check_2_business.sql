-- Check 2: Business Owner Relationship
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
