-- Debug hotel availability filtering issue
-- Test the check_hotel_availability function

-- 1. Check if we have any hotels
SELECT 
  'hotels' as table_name,
  COUNT(*) as count
FROM hotels;

-- 2. Check if we have any rooms
SELECT 
  'rooms' as table_name,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_rooms
FROM rooms;

-- 3. Check if we have room availability data
SELECT 
  'room_availability' as table_name,
  COUNT(*) as count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM room_availability;

-- 4. Test the check_hotel_availability function with a specific hotel
-- Replace 'YOUR_HOTEL_ID' with an actual hotel ID from your database
SELECT 
  h.id as hotel_id,
  h.business_id,
  b.name as hotel_name,
  COUNT(r.id) as total_rooms,
  COUNT(CASE WHEN r.is_active = true THEN 1 END) as active_rooms
FROM hotels h
JOIN businesses b ON h.business_id = b.id
LEFT JOIN rooms r ON h.id = r.hotel_id
GROUP BY h.id, h.business_id, b.name
LIMIT 5;

-- 5. Test the function directly (replace with actual hotel ID and dates)
-- SELECT check_hotel_availability(
--   'YOUR_HOTEL_ID_HERE'::UUID,
--   '2025-01-01'::DATE,
--   '2025-01-03'::DATE,
--   1,
--   0
-- );

-- 6. Check if room_availability has data for recent dates
SELECT 
  ra.room_id,
  ra.date,
  ra.available_quantity,
  r.name as room_name,
  h.business_id
FROM room_availability ra
JOIN rooms r ON ra.room_id = r.id
JOIN hotels h ON r.hotel_id = h.id
WHERE ra.date >= CURRENT_DATE
ORDER BY ra.date DESC
LIMIT 10;
