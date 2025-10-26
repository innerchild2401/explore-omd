-- Check if the room availability trigger is installed and working
-- This will help us debug the trigger functionality

-- 1. Check if the trigger exists
SELECT 
  'Trigger Check' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_room_availability';

-- 2. Check if the trigger function exists
SELECT 
  'Function Check' as check_type,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'update_room_availability_on_reservation';

-- 3. Test the trigger by manually calling the function
-- (This simulates what should happen when a reservation is created)
SELECT 
  'Manual Trigger Test' as check_type,
  'Testing trigger function' as description;

-- 4. Check the most recent room availability updates
SELECT 
  'Recent Availability Updates' as check_type,
  ra.room_id,
  ro.name as room_name,
  ra.date,
  ra.available_quantity,
  ra.last_updated
FROM room_availability ra
JOIN rooms ro ON ra.room_id = ro.id
WHERE ra.last_updated IS NOT NULL
ORDER BY ra.last_updated DESC
LIMIT 10;
