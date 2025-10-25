-- =============================================
-- HOTEL MANAGEMENT SYSTEM
-- Migration: 05_hotel_management_system.sql
-- =============================================

-- =============================================
-- 1. CREATE HOTELS TABLE (extends businesses)
-- =============================================
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  property_subtype TEXT CHECK (property_subtype IN ('hotel', 'bnb', 'guesthouse', 'hostel', 'resort', 'apartment')),
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  check_in_time TIME DEFAULT '14:00',
  check_out_time TIME DEFAULT '12:00',
  languages_spoken JSONB DEFAULT '[]',
  selected_amenities JSONB DEFAULT '[]',
  policies JSONB DEFAULT '{}',
  location_highlights TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hotels_business_id ON hotels(business_id);

-- =============================================
-- 2. CREATE RESTAURANTS TABLE (extends businesses)
-- =============================================
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  cuisine_type TEXT,
  price_range TEXT CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
  seating_capacity INTEGER,
  accepts_reservations BOOLEAN DEFAULT true,
  delivery_available BOOLEAN DEFAULT false,
  takeaway_available BOOLEAN DEFAULT false,
  opening_hours JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurants_business_id ON restaurants(business_id);

-- =============================================
-- 3. CREATE EXPERIENCES TABLE (extends businesses)
-- =============================================
CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  category TEXT,
  duration TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'moderate', 'challenging', 'expert')),
  min_participants INTEGER DEFAULT 1,
  max_participants INTEGER,
  price DECIMAL(10,2),
  includes JSONB DEFAULT '[]',
  requirements JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experiences_business_id ON experiences(business_id);

-- =============================================
-- 4. OMD AMENITIES (managed by OMD admin)
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
-- 5. UPDATE ROOMS TABLE
-- =============================================
-- Drop old rooms table and recreate with proper structure
DROP TABLE IF EXISTS rooms CASCADE;

CREATE TABLE rooms (
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
-- 6. ROOM PRICING CALENDAR
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
-- 7. ROOM AVAILABILITY
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
-- 8. UPDATE HOTEL_RESERVATIONS TABLE
-- =============================================
-- Recreate hotel_reservations to reference new hotels table
DROP TABLE IF EXISTS hotel_reservations CASCADE;

CREATE TABLE hotel_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES auth.users(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  special_requests TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hotel_reservations_hotel_id ON hotel_reservations(hotel_id);
CREATE INDEX idx_hotel_reservations_room_id ON hotel_reservations(room_id);
CREATE INDEX idx_hotel_reservations_check_in ON hotel_reservations(check_in);

-- =============================================
-- 9. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_hotels_updated_at
  BEFORE UPDATE ON hotels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiences_updated_at
  BEFORE UPDATE ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
-- 10. RLS POLICIES
-- =============================================

-- Hotels
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can manage their hotel"
ON hotels
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = hotels.business_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view active hotels"
ON hotels
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = hotels.business_id
    AND b.status = 'active'
  )
);

-- Restaurants
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their restaurant"
ON restaurants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = restaurants.business_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view active restaurants"
ON restaurants
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = restaurants.business_id
    AND b.status = 'active'
  )
);

-- Experiences
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experience owners can manage their experience"
ON experiences
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = experiences.business_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view active experiences"
ON experiences
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = experiences.business_id
    AND b.status = 'active'
  )
);

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

-- Hotel Reservations
ALTER TABLE hotel_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can view their reservations"
ON hotel_reservations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    JOIN businesses b ON h.business_id = b.id
    WHERE h.id = hotel_reservations.hotel_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Guests can view their own reservations"
ON hotel_reservations
FOR SELECT
TO authenticated
USING (guest_id = auth.uid());

CREATE POLICY "Anyone can create reservations"
ON hotel_reservations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- =============================================
-- 11. HELPER FUNCTION - Initialize Room Availability
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
