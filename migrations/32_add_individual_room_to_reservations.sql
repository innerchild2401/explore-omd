-- =============================================
-- MIGRATION 32: Add individual_room_id to reservations table
-- =============================================
-- The NewReservationModal creates bookings in 'reservations' table
-- but individual room assignment columns were missing
-- This migration adds them

-- Add individual_room_id column to reservations
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS individual_room_id UUID REFERENCES individual_rooms(id),
ADD COLUMN IF NOT EXISTS room_assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assignment_method TEXT CHECK (assignment_method IN ('auto', 'manual', 'guest_request'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_reservations_individual_room ON reservations(individual_room_id);

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

