-- =============================================
-- EXPERIENCE SYSTEM MIGRATION
-- Migration: 38_experience_system.sql
-- =============================================
-- Based on GetYourGuide.com features
-- Consistent with hotel/restaurant architecture
-- =============================================

-- =============================================
-- 1. UPDATE EXPERIENCES TABLE (add GetYourGuide-style fields)
-- =============================================
DO $$ 
BEGIN
    -- Update experiences table to add missing columns inspired by GetYourGuide
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'meeting_point') THEN
        ALTER TABLE experiences ADD COLUMN meeting_point JSONB;
    END IF;
    
    -- What's included in the experience
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'included') THEN
        ALTER TABLE experiences ADD COLUMN included TEXT[];
    END IF;
    
    -- What's NOT included (exclusions)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'not_included') THEN
        ALTER TABLE experiences ADD COLUMN not_included TEXT[];
    END IF;
    
    -- Important info/requirements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'important_info') THEN
        ALTER TABLE experiences ADD COLUMN important_info TEXT[];
    END IF;
    
    -- Cancellation policy
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'cancellation_policy') THEN
        ALTER TABLE experiences ADD COLUMN cancellation_policy TEXT;
    END IF;
    
    -- Instant confirmation flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'instant_confirmation') THEN
        ALTER TABLE experiences ADD COLUMN instant_confirmation BOOLEAN DEFAULT false;
    END IF;
    
    -- Language options available
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'languages') THEN
        ALTER TABLE experiences ADD COLUMN languages TEXT[];
    END IF;
    
    -- Whether wheelchair accessible
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'wheelchair_accessible') THEN
        ALTER TABLE experiences ADD COLUMN wheelchair_accessible BOOLEAN DEFAULT false;
    END IF;
    
    -- Tags for filtering (e.g., "family-friendly", "romantic", "adventurous")
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'tags') THEN
        ALTER TABLE experiences ADD COLUMN tags TEXT[];
    END IF;
    
    -- Price from (to replace or complement existing price field)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'price_from') THEN
        ALTER TABLE experiences ADD COLUMN price_from DECIMAL(10,2);
    END IF;
    
    -- Currency for pricing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'experiences' AND column_name = 'currency') THEN
        ALTER TABLE experiences ADD COLUMN currency TEXT DEFAULT 'USD';
    END IF;
END $$;

-- =============================================
-- 2. CREATE EXPERIENCE TIME SLOTS TABLE
-- =============================================
-- Drop old availability table if it exists
DROP TABLE IF EXISTS experience_availability CASCADE;

-- This replaces the old experience_availability table with a more structured approach
-- Similar to how restaurants don't have tables (simple), this is for scheduled experiences
CREATE TABLE experience_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER,
  max_participants INTEGER NOT NULL,
  price_per_person DECIMAL(10,2) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experience_time_slots_experience_id ON experience_time_slots(experience_id);
CREATE INDEX idx_experience_time_slots_start_date ON experience_time_slots(start_date);
CREATE INDEX idx_experience_time_slots_available ON experience_time_slots(is_available) WHERE is_available = true;

-- =============================================
-- 3. CREATE EXPERIENCE BOOKINGS TABLE
-- =============================================
-- Drop old bookings table if it exists
DROP TABLE IF EXISTS experience_bookings CASCADE;

-- Create new experience_bookings table
-- Simple booking system like restaurants (no reservation approval needed)
CREATE TABLE experience_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  time_slot_id UUID REFERENCES experience_time_slots(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  participants INTEGER NOT NULL CHECK (participants > 0),
  booking_date DATE NOT NULL,
  booking_time TIME,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_experience_bookings_experience_id ON experience_bookings(experience_id);
CREATE INDEX idx_experience_bookings_customer_email ON experience_bookings(customer_email);
CREATE INDEX idx_experience_bookings_booking_date ON experience_bookings(booking_date);

-- =============================================
-- 4. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_experience_time_slots_updated_at
  BEFORE UPDATE ON experience_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experience_bookings_updated_at
  BEFORE UPDATE ON experience_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. RLS POLICIES
-- =============================================

-- Experience Time Slots
ALTER TABLE experience_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experience owners can manage their time slots"
ON experience_time_slots
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM experiences e
    JOIN businesses b ON e.business_id = b.id
    WHERE e.id = experience_time_slots.experience_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view available time slots"
ON experience_time_slots
FOR SELECT
TO public
USING (is_available = true);

-- Experience Bookings
ALTER TABLE experience_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experience owners can view their bookings"
ON experience_bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM experiences e
    JOIN businesses b ON e.business_id = b.id
    WHERE e.id = experience_bookings.experience_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Anyone can create experience bookings"
ON experience_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Customers can update their own bookings"
ON experience_bookings
FOR UPDATE
TO authenticated
USING (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Update existing experiences table policies if needed
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

-- Ensure public can view active experiences
DROP POLICY IF EXISTS "Public can view active experiences" ON experiences;
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

-- Experience owners can manage their experiences
DROP POLICY IF EXISTS "Experience owners can manage their experience" ON experiences;
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

-- =============================================
-- 6. HELPER FUNCTION - Get available experiences for date range
-- =============================================
CREATE OR REPLACE FUNCTION get_available_experiences(
  p_omd_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  experience_id UUID,
  business_id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  images TEXT[],
  location JSONB,
  contact JSONB,
  category TEXT,
  duration TEXT,
  price_from DECIMAL,
  currency TEXT,
  difficulty_level TEXT,
  meeting_point JSONB,
  included TEXT[],
  not_included TEXT[],
  important_info TEXT[],
  tags TEXT[],
  available_slots INTEGER,
  earliest_date DATE,
  earliest_time TIME
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e.id as experience_id,
    b.id as business_id,
    b.name,
    b.slug,
    b.description,
    b.images,
    b.location,
    b.contact,
    e.category,
    e.duration,
    e.price_from,
    e.currency,
    e.difficulty_level,
    e.meeting_point,
    e.included,
    e.not_included,
    e.important_info,
    e.tags,
    COUNT(ets.id) as available_slots,
    MIN(ets.start_date) as earliest_date,
    MIN(ets.start_time) as earliest_time
  FROM experiences e
  INNER JOIN businesses b ON e.business_id = b.id
  LEFT JOIN experience_time_slots ets ON ets.experience_id = e.id 
    AND ets.is_available = true
    AND ets.start_date BETWEEN p_start_date AND p_end_date
  WHERE b.omd_id = p_omd_id
    AND b.type = 'experience'
    AND b.status = 'active'
  GROUP BY e.id, b.id, b.name, b.slug, b.description, b.images, b.location, b.contact,
           e.category, e.duration, e.price_from, e.currency, e.difficulty_level,
           e.meeting_point, e.included, e.not_included, e.important_info, e.tags
  HAVING COUNT(ets.id) > 0;
END;
$$;

-- =============================================
-- 7. COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON TABLE experiences IS 'Experience/Activity listings that extend businesses table';
COMMENT ON TABLE experience_time_slots IS 'Scheduled time slots for experiences (replaces old availability system)';
COMMENT ON TABLE experience_bookings IS 'Customer bookings for experiences - simple confirmation system';

COMMENT ON COLUMN experiences.meeting_point IS 'JSONB with address, lat/lng, and meeting point description';
COMMENT ON COLUMN experiences.included IS 'Array of what is included in the experience';
COMMENT ON COLUMN experiences.not_included IS 'Array of what is NOT included';
COMMENT ON COLUMN experiences.important_info IS 'Array of important information/requirements';
COMMENT ON COLUMN experiences.price_from IS 'Starting price for the experience';
COMMENT ON COLUMN experience_time_slots.duration_minutes IS 'Duration in minutes';
COMMENT ON COLUMN experience_bookings.booking_date IS 'Date when the experience happens';
COMMENT ON COLUMN experience_bookings.booking_time IS 'Time when the experience starts';
