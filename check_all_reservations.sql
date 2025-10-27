-- =============================================
-- Check ALL Reservations (past, current, and future)
-- =============================================

-- Show all reservations with their status and room assignments
SELECT 
  r.id AS reservation_id,
  r.confirmation_number,
  r.check_in_date,
  r.check_out_date,
  r.reservation_status,
  r.individual_room_id,
  ir.room_number,
  ir.floor_number,
  rt.name AS room_type,
  CASE 
    WHEN r.check_out_date < CURRENT_DATE THEN 'Past'
    WHEN r.check_in_date <= CURRENT_DATE AND r.check_out_date > CURRENT_DATE THEN 'Current'
    ELSE 'Future'
  END AS booking_status,
  r.adults,
  r.total_amount
FROM reservations r
LEFT JOIN individual_rooms ir ON ir.id = r.individual_room_id
LEFT JOIN rooms rt ON rt.id = ir.room_id
ORDER BY r.check_in_date DESC, r.reservation_status;

-- Check for cancelled reservations that still have room assignments
SELECT 
  r.id AS reservation_id,
  r.confirmation_number,
  r.check_in_date,
  r.check_out_date,
  r.reservation_status,
  r.individual_room_id,
  ir.room_number,
  ir.floor_number
FROM reservations r
LEFT JOIN individual_rooms ir ON ir.id = r.individual_room_id
WHERE r.reservation_status = 'cancelled'
  AND r.individual_room_id IS NOT NULL;

-- Count reservations by status
SELECT 
  reservation_status,
  COUNT(*) as count,
  COUNT(individual_room_id) as with_room_assignment,
  COUNT(*) - COUNT(individual_room_id) as without_room_assignment
FROM reservations
GROUP BY reservation_status
ORDER BY reservation_status;
