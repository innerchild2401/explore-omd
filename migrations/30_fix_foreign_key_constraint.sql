-- Check the exact foreign key constraint and fix it properly
-- This will ensure Supabase recognizes the relationship

-- 1. First, let's see what foreign key constraints exist
SELECT 
  'Current FK Constraints' as check_type,
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
  AND tc.table_name = 'room_availability';

-- 2. Drop the existing foreign key if it exists and recreate it properly
ALTER TABLE room_availability 
DROP CONSTRAINT IF EXISTS room_availability_reservation_id_fkey;

-- 3. Create the foreign key constraint with proper naming and options
ALTER TABLE room_availability 
ADD CONSTRAINT room_availability_reservation_id_fkey 
FOREIGN KEY (reservation_id) 
REFERENCES reservations(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 4. Verify the constraint was created
SELECT 
  'New FK Constraint' as check_type,
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
