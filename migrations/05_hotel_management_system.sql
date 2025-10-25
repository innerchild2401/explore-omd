-- =============================================
-- HOTEL MANAGEMENT SYSTEM
-- Migration: 05_hotel_management_system.sql
-- =============================================

-- =============================================
-- 1. OMD AMENITIES (managed by OMD admin)
-- =============================================
CREATE TABLE IF NOT EXISTS omd_amenities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'room', 'facility')),
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_omd_amenities_omd_id ON omd_amenities(omd_id);

-- =============================================
-- 2. UPDATE HOTELS TABLE
-- =============================================
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS property_subtype TEXT CHECK (property_subtype IN ('hotel', 'bnb', 'guesthouse', 'hostel', 'resort', 'apartment'));
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS check_in_time TIME DEFAULT '14:00';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS check_out_time TIME DEFAULT '12:00';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS languages_spoken JSONB DEFAULT '[]';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS selected_amenities JSONB DEFAULT '[]';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS policies JSONB DEFAULT '{}';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS location_highlights TEXT;

-- =============================================
-- 3. ROOMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('single', 'double', 'twin', 'triple', 'quad', 'suite', 'studio', 'apartment')),
  max_occupancy INTEGER NOT NULL,
  bed_configuration JSONB DEFAULT '{}',
  size_sqm INTEGER,
  base_price DECIMAL(10,2) NOT NULL,
  room_amenities JSONB DEFAULT '[]',
  images TEXT[] DEFAULT '{}',
  quantity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rooms_hotel_id ON rooms(hotel_id);

-- =============================================
-- 4. ROOM PRICING CALENDAR
-- =============================================
CREATE TABLE IF NOT EXISTS room_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  min_stay INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_room_pricing_room_id ON room_pricing(room_id);
CREATE INDEX idx_room_pricing_dates ON room_pricing(start_date, end_date);

-- =============================================
-- 5. ROOM AVAILABILITY
-- =============================================
CREATE TABLE IF NOT EXISTS room_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, date)
);

CREATE INDEX idx_room_availability_room_id ON room_availability(room_id);
CREATE INDEX idx_room_availability_date ON room_availability(date);

-- =============================================
-- 6. UPDATE HOTEL_RESERVATIONS TABLE
-- =============================================
ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS special_requests TEXT;
ALTER TABLE hotel_reservations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- =============================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_omd_amenities_updated_at
  BEFORE UPDATE ON omd_amenities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_pricing_updated_at
  BEFORE UPDATE ON room_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. RLS POLICIES
-- =============================================

-- OMD Amenities
ALTER TABLE omd_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OMD admins can manage amenities"
ON omd_amenities
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = omd_amenities.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

CREATE POLICY "Public can view amenities"
ON omd_amenities
FOR SELECT
TO public
USING (true);

-- Rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can manage their rooms"
ON rooms
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    JOIN businesses b ON h.business_id = b.id
    WHERE h.id = rooms.hotel_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view active rooms"
ON rooms
FOR SELECT
TO public
USING (is_active = true);

-- Room Pricing
ALTER TABLE room_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can manage room pricing"
ON room_pricing
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.id = room_pricing.room_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view room pricing"
ON room_pricing
FOR SELECT
TO public
USING (true);

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

CREATE POLICY "Public can view room availability"
ON room_availability
FOR SELECT
TO public
USING (true);

-- =============================================
-- 9. HELPER FUNCTION - Initialize Room Availability
-- =============================================
CREATE OR REPLACE FUNCTION initialize_room_availability(
  p_room_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_quantity INTEGER
)
RETURNS void AS $$
DECLARE
  current_date DATE;
BEGIN
  current_date := p_start_date;
  WHILE current_date <= p_end_date LOOP
    INSERT INTO room_availability (room_id, date, available_quantity)
    VALUES (p_room_id, current_date, p_quantity)
    ON CONFLICT (room_id, date) DO NOTHING;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 10. SAMPLE DATA - Common Amenities
-- =============================================
-- Note: OMD admins should add these through the UI
-- This is just an example for reference

COMMENT ON TABLE omd_amenities IS 'Sample amenities that OMD admins can add:
General: Free WiFi, Parking, Breakfast Included, Restaurant, Bar, 24h Reception, Elevator, Heating, Air Conditioning
Room: Private Bathroom, TV, Mini Bar, Safe, Balcony, Sea View, City View, Coffee Machine
Facility: Swimming Pool, Gym, Spa, Garden, Terrace, Business Center, Conference Room, Laundry Service';

