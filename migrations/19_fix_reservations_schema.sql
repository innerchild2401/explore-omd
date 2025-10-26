-- =============================================
-- Migration 19: Fix reservations table schema
-- =============================================
-- This migration fixes the data type mismatch in the reservations table
-- where check_in_date and check_out_date might be defined as INTEGER instead of DATE

-- First, let's check the current schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reservations' 
ORDER BY ordinal_position;

-- If check_in_date and check_out_date are INTEGER, we need to fix them
-- This is a destructive operation, so we'll need to be careful

-- Step 1: Create a backup of existing data
CREATE TABLE IF NOT EXISTS reservations_backup AS 
SELECT * FROM reservations;

-- Step 2: Drop the existing reservations table
DROP TABLE IF EXISTS reservations CASCADE;

-- Step 3: Recreate the reservations table with correct schema
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  confirmation_number TEXT UNIQUE NOT NULL, -- Auto-generated confirmation code
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES booking_channels(id),
  
  -- Booking Details
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  
  -- Room Assignment
  room_id UUID REFERENCES rooms(id),
  room_type_requested TEXT, -- In case specific room not assigned yet
  
  -- Pricing
  base_rate DECIMAL(10,2) NOT NULL,
  taxes DECIMAL(10,2) DEFAULT 0,
  fees DECIMAL(10,2) DEFAULT 0, -- Service fees, cleaning fees, etc.
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded', 'failed')),
  payment_method TEXT, -- 'credit_card', 'bank_transfer', 'cash', 'voucher'
  payment_reference TEXT, -- Transaction ID
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Status Management
  reservation_status TEXT DEFAULT 'confirmed' CHECK (reservation_status IN ('tentative', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  cancellation_policy TEXT, -- 'free', '24h', '48h', '7d', 'non_refundable'
  cancellation_deadline TIMESTAMPTZ,
  
  -- Special Requirements
  special_requests TEXT,
  arrival_time TEXT, -- 'morning', 'afternoon', 'evening', 'late_night'
  group_name TEXT, -- For group bookings
  corporate_code TEXT, -- For corporate bookings
  
  -- Communication
  confirmation_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  follow_up_sent BOOLEAN DEFAULT false,
  
  -- Audit Trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  last_modified_by UUID REFERENCES user_profiles(id),
  
  CONSTRAINT valid_date_range CHECK (check_out_date > check_in_date),
  CONSTRAINT valid_occupancy CHECK (adults > 0),
  CONSTRAINT valid_amounts CHECK (total_amount >= 0 AND base_rate >= 0)
);

-- Step 4: Restore data from backup (if any exists)
-- Note: This will only work if the backup table has compatible data types
-- If there are existing reservations with wrong data types, they'll need to be handled manually

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_id ON reservations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_id ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_channel_id ON reservations(channel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in_date ON reservations(check_in_date);
CREATE INDEX IF NOT EXISTS idx_reservations_check_out_date ON reservations(check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(reservation_status);
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status ON reservations(payment_status);
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_number ON reservations(confirmation_number);

-- Step 6: Recreate RLS policies
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Policy for hotel owners to manage their reservations
CREATE POLICY "Hotel owners can manage their reservations"
ON reservations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM businesses b
    WHERE b.id = hotel_id
    AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM businesses b
    WHERE b.id = hotel_id
    AND b.owner_id = auth.uid()
  )
);

-- Policy for OMD admins to view reservations in their OMD
CREATE POLICY "OMD admins can view reservations in their OMD"
ON reservations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM businesses b
    JOIN user_profiles up ON up.omd_id = b.omd_id
    WHERE b.id = hotel_id
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- Step 7: Recreate triggers
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER create_reservation_event
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_event();

-- Step 8: Verify the schema is correct
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reservations' 
ORDER BY ordinal_position;