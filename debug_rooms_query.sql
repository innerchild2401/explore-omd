-- Debug: Check rooms in the database
SELECT 
  r.id as room_id,
  r.name as room_name,
  r.hotel_id,
  b.id as business_id,
  b.name as business_name
FROM rooms r
LEFT JOIN businesses b ON b.id = r.hotel_id
ORDER BY r.name;
