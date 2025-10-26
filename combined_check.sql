-- Combined query to check reservations, availability, and trigger status
-- Run this single query to get all the information at once

-- 1. Current Reservations
SELECT 
  'RESERVATIONS' as category,
  r.id::text as id,
  r.confirmation_number as name,
  r.check_in_date::text as date_info,
  r.check_out_date::text as status_info,
  ro.name as room_name,
  r.reservation_status as extra_info
FROM reservations r
JOIN rooms ro ON r.room_id = ro.id

UNION ALL

-- 2. Room Availability (next 7 days)
SELECT 
  'AVAILABILITY' as category,
  ra.room_id::text as id,
  ro.name as name,
  ra.date::text as date_info,
  ra.available_quantity::text as status_info,
  ro.quantity::text as room_name,
  'total_qty' as extra_info
FROM room_availability ra
JOIN rooms ro ON ra.room_id = ro.id
WHERE ra.date >= CURRENT_DATE 
  AND ra.date <= CURRENT_DATE + INTERVAL '7 days'

UNION ALL

-- 3. Trigger Status
SELECT 
  'TRIGGER' as category,
  trigger_name as id,
  event_manipulation as name,
  action_timing as date_info,
  'EXISTS' as status_info,
  'trigger_update_room_availability' as room_name,
  'INSTALLED' as extra_info
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_room_availability'

UNION ALL

-- 4. Function Status  
SELECT 
  'FUNCTION' as category,
  routine_name as id,
  routine_type as name,
  'EXISTS' as date_info,
  'WORKING' as status_info,
  'update_room_availability_on_reservation' as room_name,
  'AVAILABLE' as extra_info
FROM information_schema.routines 
WHERE routine_name = 'update_room_availability_on_reservation'

ORDER BY category, id;
