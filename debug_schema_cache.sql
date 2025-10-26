-- Check if the foreign key relationship is properly recognized by Supabase
-- This will help us understand why the schema cache isn't updated

-- 1. Check if the foreign key constraint exists
SELECT 
  'Foreign Key Check' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'room_availability'
  AND kcu.column_name = 'reservation_id';

-- 2. Check if we can manually join the tables
SELECT 
  'Manual Join Test' as check_type,
  ra.id,
  ra.room_id,
  ra.date,
  ra.available_quantity,
  ra.reservation_id,
  r.confirmation_number
FROM room_availability ra
LEFT JOIN reservations r ON ra.reservation_id = r.id
WHERE ra.date >= CURRENT_DATE 
  AND ra.date <= CURRENT_DATE + INTERVAL '7 days'
LIMIT 5;

-- 3. Check rooms table to see if rooms are being fetched
SELECT 
  'Rooms Check' as check_type,
  r.id,
  r.name,
  r.quantity,
  r.is_active,
  b.name as business_name
FROM rooms r
JOIN hotels h ON r.hotel_id = h.id
JOIN businesses b ON h.business_id = b.id
WHERE r.is_active = true
ORDER BY r.name;
