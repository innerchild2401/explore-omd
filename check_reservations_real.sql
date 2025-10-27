-- =============================================
-- Check ALL reservation tables
-- =============================================

-- Check reservations table (the one being written to)
SELECT 
  id,
  confirmation_number,
  check_in_date,
  check_out_date,
  reservation_status,
  individual_room_id,
  hotel_id,
  guest_id,
  created_at
FROM reservations
ORDER BY created_at DESC
LIMIT 10;

-- Check hotel_reservations table (old table)
SELECT 
  id,
  check_in,
  check_out,
  status,
  individual_room_id,
  hotel_id,
  created_at
FROM hotel_reservations
ORDER BY created_at DESC
LIMIT 10;

-- Summary
SELECT 
  'reservations table' as table_name,
  COUNT(*) as total_count
FROM reservations
UNION ALL
SELECT 
  'hotel_reservations table' as table_name,
  COUNT(*) as total_count
FROM hotel_reservations;

