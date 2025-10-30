-- Check the actual room_availability table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'room_availability'
ORDER BY ordinal_position;

