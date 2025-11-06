-- =============================================
-- Migration: Add cancellation_reason to reservations table
-- =============================================
-- This migration adds the cancellation_reason column to the reservations table
-- to store reasons when hotel admins reject pending reservations

-- Add cancellation_reason column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reservations' 
        AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE reservations 
        ADD COLUMN cancellation_reason TEXT;
        
        COMMENT ON COLUMN reservations.cancellation_reason IS 'Reason for cancellation/rejection, provided by hotel admin when rejecting a reservation';
    END IF;
END $$;

