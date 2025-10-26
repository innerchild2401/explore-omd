-- Quick fix: Update hotel owner to current user
-- This will make the current user the owner of the hotel

UPDATE businesses 
SET owner_id = '6295c4da-27a8-4f43-b072-9758fe21bba7'
WHERE id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8';

-- Verify the update
SELECT 
    id,
    name,
    owner_id,
    CASE 
        WHEN owner_id = '6295c4da-27a8-4f43-b072-9758fe21bba7' THEN 'OWNER_UPDATED'
        ELSE 'OWNER_NOT_UPDATED'
    END as update_status
FROM businesses 
WHERE id = 'dcbac38a-592a-424a-b59d-3a7fd0a429f8';
