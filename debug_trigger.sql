-- Debug: Check if trigger is working by manually updating a reservation
-- This should fire the trigger and update the reservation_id

-- First, let's see what reservations exist for Suita room
SELECT 
  'Existing Reservations' as check_type,
  r.id,
  r.confirmation_number,
  r.check_in_date,
  r.check_out_date,
  r.reservation_status,
  r.created_at
FROM reservations r
JOIN rooms ro ON r.room_id = ro.id
WHERE ro.name = 'Suita'
  AND r.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
ORDER BY r.created_at DESC;

-- Now let's manually trigger the availability update by updating a reservation
-- This should fire the trigger and set the reservation_id
UPDATE reservations 
SET updated_at = NOW()
WHERE id IN (
  SELECT r.id 
  FROM reservations r
  JOIN rooms ro ON r.room_id = ro.id
  WHERE ro.name = 'Suita'
    AND r.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
);

-- Check if the trigger fired and updated reservation_id
SELECT 
  'After Manual Trigger' as check_type,
  ra.room_id,
  ro.name as room_name,
  ra.date,
  ra.available_quantity,
  ra.reservation_id,
  r.confirmation_number,
  r.reservation_status
FROM room_availability ra
JOIN rooms ro ON ra.room_id = ro.id
LEFT JOIN reservations r ON ra.reservation_id = r.id
WHERE ro.name = 'Suita'
  AND ra.date >= CURRENT_DATE 
  AND ra.date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY ra.date;
