-- Test the trigger by checking Suita room specifically
-- This should show the overbooked dates with reservation_id populated
SELECT 
  'Suita Room Test' as check_type,
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
