-- Check the actual trigger definitions
SELECT 
  tgname as trigger_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'reservations'::regclass
  AND NOT tgisinternal;

-- Check function definitions
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname IN (
  'check_room_availability_before_update',
  'update_room_availability_on_booking',
  'update_room_availability_on_reservation'
);

