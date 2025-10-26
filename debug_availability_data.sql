-- Debug: Check what data is actually being returned using UNION ALL
-- This will help us understand why only one row is showing

-- 1. Check rooms data (should show all rooms)
SELECT 
  'ROOMS' as category,
  r.id::text as id,
  r.name,
  r.quantity::text as date_info,
  r.is_active::text as status_info,
  b.name as business_name,
  h.id::text as hotel_id
FROM rooms r
JOIN hotels h ON r.hotel_id = h.id
JOIN businesses b ON h.business_id = b.id
WHERE r.is_active = true

UNION ALL

-- 2. Check room_availability data for the next 7 days
SELECT 
  'AVAILABILITY' as category,
  ra.id::text as id,
  ro.name as name,
  ra.date::text as date_info,
  ra.available_quantity::text as status_info,
  'room_availability' as business_name,
  ra.room_id::text as hotel_id
FROM room_availability ra
JOIN rooms ro ON ra.room_id = ro.id
WHERE ra.date >= CURRENT_DATE 
  AND ra.date <= CURRENT_DATE + INTERVAL '7 days'

UNION ALL

-- 3. Check if there are any reservations for the date range
SELECT 
  'RESERVATIONS' as category,
  r.id::text as id,
  r.confirmation_number as name,
  r.check_in_date::text as date_info,
  r.reservation_status as status_info,
  ro.name as business_name,
  r.room_id::text as hotel_id
FROM reservations r
JOIN rooms ro ON r.room_id = ro.id
WHERE r.check_in_date <= CURRENT_DATE + INTERVAL '7 days'
  AND r.check_out_date >= CURRENT_DATE

ORDER BY category, name;
