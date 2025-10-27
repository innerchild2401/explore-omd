-- Check what foreign key constraint exists for hotel_id
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname LIKE '%hotel%'
AND conrelid::regclass::text = 'reservations';

