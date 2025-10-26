-- Check existing reservations and their impact on room availability
-- This will help us verify if the trigger is working correctly

-- 1. Check all existing reservations
SELECT 
  'Current Reservations' as check_type,
  r.id,
  r.confirmation_number,
  r.check_in_date,
  r.check_out_date,
  r.room_id,
  ro.name as room_name,
  r.reservation_status,
  r.guest_id
FROM reservations r
JOIN rooms ro ON r.room_id = ro.id
ORDER BY r.check_in_date;

-- 2. Check room availability for the next 30 days
SELECT 
  'Room Availability' as check_type,
  ra.room_id,
  ro.name as room_name,
  ra.date,
  ra.available_quantity,
  ro.quantity as total_quantity,
  (ro.quantity - ra.available_quantity) as booked_quantity
FROM room_availability ra
JOIN rooms ro ON ra.room_id = ro.id
WHERE ra.date >= CURRENT_DATE 
  AND ra.date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY ra.room_id, ra.date;

-- 3. Check if availability matches reservations for specific dates
SELECT 
  'Availability vs Reservations Check' as check_type,
  ra.room_id,
  ro.name as room_name,
  ra.date,
  ra.available_quantity,
  ro.quantity as total_quantity,
  COUNT(r.id) as reservation_count,
  CASE 
    WHEN ra.available_quantity = (ro.quantity - COUNT(r.id)) THEN 'MATCH'
    ELSE 'MISMATCH'
  END as status
FROM room_availability ra
JOIN rooms ro ON ra.room_id = ro.id
LEFT JOIN reservations r ON r.room_id = ra.room_id 
  AND r.check_in_date <= ra.date 
  AND r.check_out_date > ra.date
  AND r.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
WHERE ra.date >= CURRENT_DATE 
  AND ra.date <= CURRENT_DATE + INTERVAL '7 days'
GROUP BY ra.room_id, ro.name, ra.date, ra.available_quantity, ro.quantity
ORDER BY ra.room_id, ra.date;
