-- Check the actual schema of the reservations table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reservations' 
  AND column_name IN ('check_in_date', 'check_out_date', 'adults', 'children', 'infants', 'room_id')
ORDER BY ordinal_position;
