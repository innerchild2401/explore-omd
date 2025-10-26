-- Check 4: RLS Policy Test
SELECT 
    'RLS Policy Test' as check_type,
    EXISTS (
        SELECT 1
        FROM businesses b
        WHERE b.id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8'
        AND b.owner_id = auth.uid()
    ) as policy_allows_insert;
