-- Check actual room quantities and fix the data
SELECT 
  'ROOM_QUANTITIES' as category,
  id::text as id,
  name,
  quantity::text as date_info,
  room_type as status_info,
  'rooms' as room_name,
  'actual_qty' as extra_info
FROM rooms
ORDER BY name;
