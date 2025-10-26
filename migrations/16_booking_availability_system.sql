-- =============================================
-- COMPREHENSIVE BOOKING & AVAILABILITY SYSTEM
-- Migration: 16_booking_availability_system.sql
-- =============================================

-- =============================================
-- 1. GUEST PROFILES TABLE
-- =============================================

CREATE TABLE guest_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  nationality TEXT,
  passport_number TEXT,
  address JSONB, -- {street, city, country, postal_code}
  preferences JSONB, -- {room_type, floor, amenities, dietary_restrictions}
  loyalty_tier TEXT DEFAULT 'standard' CHECK (loyalty_tier IN ('standard', 'silver', 'gold', 'platinum')),
  loyalty_points INTEGER DEFAULT 0,
  total_stays INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_stay_date DATE,
  marketing_consent BOOLEAN DEFAULT false,
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. BOOKING CHANNELS TABLE
-- =============================================

CREATE TABLE booking_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'direct', 'booking.com', 'expedia', 'airbnb', etc.
  display_name TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('direct', 'ota', 'corporate', 'gds', 'walk_in')),
  commission_rate DECIMAL(5,2) DEFAULT 0, -- Commission percentage
  is_active BOOLEAN DEFAULT true,
  api_endpoint TEXT, -- For channel manager integration
  api_key TEXT, -- Encrypted API credentials
  webhook_url TEXT, -- For real-time updates
  sync_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. RESERVATIONS TABLE
-- =============================================

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

-- =============================================
-- 4. ROOM AVAILABILITY TABLE (Real-time availability)
-- =============================================

CREATE TABLE room_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  availability_status TEXT NOT NULL CHECK (availability_status IN ('available', 'booked', 'blocked', 'maintenance', 'out_of_order')),
  reservation_id UUID REFERENCES reservations(id), -- If booked, link to reservation
  blocked_reason TEXT, -- 'maintenance', 'group_booking', 'inventory_hold'
  blocked_by UUID REFERENCES user_profiles(id), -- Who blocked the room
  housekeeping_status TEXT DEFAULT 'clean' CHECK (housekeeping_status IN ('clean', 'dirty', 'inspected', 'out_of_order')),
  housekeeping_notes TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(room_id, date)
);

-- =============================================
-- 5. BOOKING EVENTS TABLE (Audit trail)
-- =============================================

CREATE TABLE booking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'modified', 'cancelled', 'checked_in', 'checked_out', 'no_show', 'payment_received', 'refund_issued')),
  event_description TEXT NOT NULL,
  old_values JSONB, -- Previous values for modifications
  new_values JSONB, -- New values for modifications
  user_id UUID REFERENCES user_profiles(id), -- Who made the change
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. PAYMENT TRANSACTIONS TABLE
-- =============================================

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'chargeback', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  payment_method TEXT NOT NULL,
  payment_gateway TEXT, -- 'stripe', 'paypal', 'bank_transfer'
  gateway_transaction_id TEXT,
  gateway_response JSONB, -- Full response from payment gateway
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- =============================================
-- 7. CHANNEL SYNC LOGS TABLE
-- =============================================

CREATE TABLE channel_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES booking_channels(id),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('availability', 'rates', 'reservations', 'inventory')),
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  records_processed INTEGER DEFAULT 0,
  records_successful INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  sync_started_at TIMESTAMPTZ DEFAULT NOW(),
  sync_completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- =============================================
-- 8. INDEXES FOR PERFORMANCE
-- =============================================

-- Guest profiles indexes
CREATE INDEX idx_guest_profiles_email ON guest_profiles(email);
CREATE INDEX idx_guest_profiles_loyalty ON guest_profiles(loyalty_tier);
CREATE INDEX idx_guest_profiles_last_stay ON guest_profiles(last_stay_date);

-- Reservations indexes
CREATE INDEX idx_reservations_hotel_id ON reservations(hotel_id);
CREATE INDEX idx_reservations_guest_id ON reservations(guest_id);
CREATE INDEX idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX idx_reservations_status ON reservations(reservation_status);
CREATE INDEX idx_reservations_confirmation ON reservations(confirmation_number);
CREATE INDEX idx_reservations_channel ON reservations(channel_id);
CREATE INDEX idx_reservations_room_id ON reservations(room_id);

-- Room availability indexes
CREATE INDEX idx_room_availability_room_date ON room_availability(room_id, date);
CREATE INDEX idx_room_availability_status ON room_availability(availability_status);
CREATE INDEX idx_room_availability_date ON room_availability(date);

-- Booking events indexes
CREATE INDEX idx_booking_events_reservation ON booking_events(reservation_id);
CREATE INDEX idx_booking_events_type ON booking_events(event_type);
CREATE INDEX idx_booking_events_created ON booking_events(created_at);

-- Payment transactions indexes
CREATE INDEX idx_payment_transactions_reservation ON payment_transactions(reservation_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_gateway ON payment_transactions(gateway_transaction_id);

-- Channel sync logs indexes
CREATE INDEX idx_channel_sync_logs_channel ON channel_sync_logs(channel_id);
CREATE INDEX idx_channel_sync_logs_status ON channel_sync_logs(status);
CREATE INDEX idx_channel_sync_logs_started ON channel_sync_logs(sync_started_at);

-- =============================================
-- 9. FUNCTIONS FOR BOOKING MANAGEMENT
-- =============================================

-- Function to generate confirmation number
CREATE OR REPLACE FUNCTION generate_confirmation_number()
RETURNS TEXT AS $$
DECLARE
  confirmation TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- Generate format: YYYYMMDD-XXXX (date + 4 random chars)
    confirmation := TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                   UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    -- Check if it already exists
    SELECT COUNT(*) INTO exists_count
    FROM reservations
    WHERE confirmation_number = confirmation;
    
    -- If unique, return it
    IF exists_count = 0 THEN
      RETURN confirmation;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check room availability
CREATE OR REPLACE FUNCTION check_room_availability(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for conflicts in the date range
  SELECT COUNT(*) INTO conflict_count
  FROM room_availability
  WHERE room_id = p_room_id
    AND date >= p_check_in
    AND date < p_check_out
    AND availability_status IN ('booked', 'blocked', 'out_of_order');
  
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total booking amount
CREATE OR REPLACE FUNCTION calculate_booking_total(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER,
  p_children INTEGER DEFAULT 0
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  total_amount DECIMAL(10,2) := 0;
  current_date DATE;
  daily_rate DECIMAL(10,2);
  nights INTEGER;
BEGIN
  nights := p_check_out - p_check_in;
  
  -- Calculate rate for each night
  FOR current_date IN p_check_in..(p_check_out - 1) LOOP
    -- Get pricing for this specific date
    SELECT calculate_room_price(p_room_id, current_date) INTO daily_rate;
    
    IF daily_rate IS NULL THEN
      RETURN NULL; -- Room not available for pricing
    END IF;
    
    total_amount := total_amount + daily_rate;
  END LOOP;
  
  -- Add taxes (simplified - could be more complex)
  total_amount := total_amount * 1.1; -- 10% tax
  
  RETURN total_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to create room availability for date range
CREATE OR REPLACE FUNCTION create_room_availability(
  p_room_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_status TEXT DEFAULT 'available'
) RETURNS VOID AS $$
DECLARE
  current_date DATE;
BEGIN
  FOR current_date IN p_start_date..(p_end_date - 1) LOOP
    INSERT INTO room_availability (room_id, date, availability_status)
    VALUES (p_room_id, current_date, p_status)
    ON CONFLICT (room_id, date) 
    DO UPDATE SET 
      availability_status = EXCLUDED.availability_status,
      last_updated = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 10. TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_guest_profiles_updated_at
  BEFORE UPDATE ON guest_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_channels_updated_at
  BEFORE UPDATE ON booking_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create booking event when reservation is created/modified
CREATE OR REPLACE FUNCTION create_booking_event()
RETURNS TRIGGER AS $$
DECLARE
  event_desc TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_desc := 'Reservation created';
    INSERT INTO booking_events (reservation_id, event_type, event_description, new_values)
    VALUES (NEW.id, 'created', event_desc, row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    event_desc := 'Reservation modified';
    INSERT INTO booking_events (reservation_id, event_type, event_description, old_values, new_values)
    VALUES (NEW.id, 'modified', event_desc, row_to_json(OLD), row_to_json(NEW));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_reservation_event
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_event();

-- Trigger to update room availability when reservation is created
CREATE OR REPLACE FUNCTION update_room_availability_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.room_id IS NOT NULL THEN
    -- Mark room as booked for the reservation dates
    PERFORM create_room_availability(
      NEW.room_id, 
      NEW.check_in_date, 
      NEW.check_out_date, 
      'booked'
    );
    
    -- Update room availability records with reservation_id
    UPDATE room_availability
    SET reservation_id = NEW.id
    WHERE room_id = NEW.room_id
      AND date >= NEW.check_in_date
      AND date < NEW.check_out_date;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle room changes
    IF OLD.room_id IS DISTINCT FROM NEW.room_id THEN
      -- Free up old room
      IF OLD.room_id IS NOT NULL THEN
        UPDATE room_availability
        SET availability_status = 'available', reservation_id = NULL
        WHERE room_id = OLD.room_id
          AND date >= OLD.check_in_date
          AND date < OLD.check_out_date;
      END IF;
      
      -- Book new room
      IF NEW.room_id IS NOT NULL THEN
        PERFORM create_room_availability(
          NEW.room_id, 
          NEW.check_in_date, 
          NEW.check_out_date, 
          'booked'
        );
        
        UPDATE room_availability
        SET reservation_id = NEW.id
        WHERE room_id = NEW.room_id
          AND date >= NEW.check_in_date
          AND date < NEW.check_out_date;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_availability_on_booking
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_room_availability_on_booking();

-- =============================================
-- 11. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Guest Profiles
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can manage guest profiles"
ON guest_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.guest_id = guest_profiles.id
    AND b.owner_id = auth.uid()
  )
);

-- Reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can manage reservations"
ON reservations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    JOIN businesses b ON h.business_id = b.id
    WHERE h.id = reservations.hotel_id
    AND b.owner_id = auth.uid()
  )
);

-- Room Availability
ALTER TABLE room_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can manage room availability"
ON room_availability
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.id = room_availability.room_id
    AND b.owner_id = auth.uid()
  )
);

-- Booking Events
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can view booking events"
ON booking_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.id = booking_events.reservation_id
    AND b.owner_id = auth.uid()
  )
);

-- Payment Transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can manage payment transactions"
ON payment_transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.id = payment_transactions.reservation_id
    AND b.owner_id = auth.uid()
  )
);

-- =============================================
-- 12. SAMPLE DATA FOR TESTING
-- =============================================

-- Insert default booking channels
INSERT INTO booking_channels (name, display_name, channel_type, commission_rate, is_active) VALUES
('direct', 'Direct Booking', 'direct', 0.00, true),
('booking_com', 'Booking.com', 'ota', 15.00, true),
('expedia', 'Expedia', 'ota', 12.00, true),
('airbnb', 'Airbnb', 'ota', 3.00, true),
('walk_in', 'Walk-in', 'walk_in', 0.00, true),
('corporate', 'Corporate', 'corporate', 5.00, true);

-- =============================================
-- 13. VERIFICATION QUERIES
-- =============================================

-- Verify the new schema
SELECT 
  'guest_profiles' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'guest_profiles'

UNION ALL

SELECT 
  'booking_channels' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'booking_channels'

UNION ALL

SELECT 
  'reservations' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'reservations'

UNION ALL

SELECT 
  'room_availability' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'room_availability'

UNION ALL

SELECT 
  'booking_events' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'booking_events'

UNION ALL

SELECT 
  'payment_transactions' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'payment_transactions'

UNION ALL

SELECT 
  'channel_sync_logs' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'channel_sync_logs';

-- Test confirmation number generation
SELECT generate_confirmation_number() as sample_confirmation;

-- Test room availability function
SELECT 
  r.name as room_name,
  check_room_availability(r.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days') as is_available
FROM rooms r
LIMIT 3;
