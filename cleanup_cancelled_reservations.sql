-- =============================================
-- Cleanup: Remove room assignments from cancelled reservations
-- =============================================

-- This will free up rooms that were assigned to cancelled reservations
UPDATE reservations
SET individual_room_id = NULL,
    assignment_method = NULL,
    updated_at = NOW()
WHERE reservation_status = 'cancelled'
  AND individual_room_id IS NOT NULL;

-- Check results
SELECT 
  reservation_status,
  COUNT(*) as total,
  COUNT(individual_room_id) as with_room,
  COUNT(*) - COUNT(individual_room_id) as without_room
FROM reservations
GROUP BY reservation_status
ORDER BY reservation_status;
