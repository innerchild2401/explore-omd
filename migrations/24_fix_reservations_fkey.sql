-- =============================================
-- Migration 24: Fix reservations foreign key constraint
-- =============================================
-- This migration fixes the foreign key constraint in reservations table
-- to reference businesses instead of hotels

-- First, let's check the current constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='reservations'
AND kcu.column_name = 'hotel_id';

-- Drop the existing foreign key constraint
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_hotel_id_fkey;

-- Add new foreign key constraint to reference businesses table
ALTER TABLE reservations 
ADD CONSTRAINT reservations_hotel_id_fkey 
FOREIGN KEY (hotel_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- Verify the new constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='reservations'
AND kcu.column_name = 'hotel_id';
