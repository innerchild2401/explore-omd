-- Check hotel_id used in reservations
SELECT 
  r.id as reservation_id,
  r.hotel_id as reservation_hotel_id,
  h.id as hotel_id,
  h.business_id as hotel_business_id
FROM reservations r
LEFT JOIN hotels h ON r.hotel_id = h.id
ORDER BY r.created_at DESC;

-- Check what individual rooms exist
SELECT 
  r.name as room_type,
  COUNT(ir.id) as individual_rooms_count
FROM rooms r
LEFT JOIN individual_rooms ir ON r.id = ir.room_id
GROUP BY r.id, r.name;

