-- =============================================
-- ANALYTICS SYSTEM MIGRATION
-- Migration: 39_analytics_system.sql
-- =============================================
-- Comprehensive analytics tracking for OMD admin
-- Track visitor behavior, conversions, and revenue
-- =============================================

-- =============================================
-- 1. CREATE BUSINESS_ANALYTICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS business_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Event Type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view',           -- Someone viewed the business listing page
    'detail_view',         -- Someone viewed full business details
    'gallery_view',        -- Someone viewed image gallery
    'contact_click',       -- Someone clicked call/email button
    'menu_view',           -- Restaurant: viewed menu
    'menu_item_view',      -- Restaurant: viewed specific menu item
    'room_view',           -- Hotel: viewed room details
    'availability_check',  -- Hotel: checked availability
    'time_slot_view',      -- Experience: viewed time slots
    'booking_initiated',   -- Started booking process
    'booking_completed',   -- Completed booking
    'booking_cancelled'    -- Cancelled booking
  )),
  
  -- User Information
  session_id TEXT,              -- For anonymous users (client-generated UUID)
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  
  -- Event Context
  referrer TEXT,                -- Where they came from
  page_url TEXT,                -- Current page URL
  metadata JSONB DEFAULT '{}',  -- Additional event-specific data (e.g., room_id, menu_item_id)
  
  -- Revenue (for booking events)
  revenue_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. CREATE BUSINESS_REVENUE TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS business_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN ('hotel_reservation', 'restaurant_order', 'experience_booking')),
  source_id UUID NOT NULL,  -- References reservation_id, order_id, booking_id, etc.
  
  -- Revenue Details
  gross_amount DECIMAL(10,2) NOT NULL,
  fees DECIMAL(10,2) DEFAULT 0,     -- Platform fees (can be set later)
  net_amount DECIMAL(10,2) NOT NULL, -- Amount to business (gross - fees)
  currency TEXT DEFAULT 'EUR',
  
  -- Period
  check_in_date DATE,           -- For hotels
  check_out_date DATE,          -- For hotels
  booking_date DATE,            -- For experiences/restaurants
  year INTEGER NOT NULL,        -- For easy grouping
  month INTEGER NOT NULL,       -- For easy grouping
  
  -- Status
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Business Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_business_analytics_business_id ON business_analytics(business_id);
CREATE INDEX IF NOT EXISTS idx_business_analytics_event_type ON business_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_business_analytics_created_at ON business_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_business_analytics_session_id ON business_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_business_analytics_user_id ON business_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_business_analytics_composite ON business_analytics(business_id, created_at, event_type);

-- Business Revenue Indexes
CREATE INDEX IF NOT EXISTS idx_business_revenue_business_id ON business_revenue(business_id);
CREATE INDEX IF NOT EXISTS idx_business_revenue_year_month ON business_revenue(year, month);
CREATE INDEX IF NOT EXISTS idx_business_revenue_payment_status ON business_revenue(payment_status);
CREATE INDEX IF NOT EXISTS idx_business_revenue_created_at ON business_revenue(created_at);
CREATE INDEX IF NOT EXISTS idx_business_revenue_source ON business_revenue(source_type, source_id);

-- =============================================
-- 4. CREATE UPDATED_AT TRIGGER FOR business_revenue
-- =============================================
CREATE OR REPLACE FUNCTION update_business_revenue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_business_revenue_updated_at ON business_revenue;
CREATE TRIGGER set_business_revenue_updated_at
  BEFORE UPDATE ON business_revenue
  FOR EACH ROW
  EXECUTE FUNCTION update_business_revenue_updated_at();

-- =============================================
-- 5. CREATE RLS POLICIES FOR business_analytics
-- =============================================

-- Enable RLS
ALTER TABLE business_analytics ENABLE ROW LEVEL SECURITY;

-- Allow public insert for tracking (anonymous users can track events)
CREATE POLICY "Anyone can insert analytics events"
ON business_analytics
FOR INSERT
TO public
WITH CHECK (true);

-- OMD admins can view all analytics for their OMD's businesses
CREATE POLICY "OMD admins can view analytics for their OMD"
ON business_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN businesses b ON b.omd_id = up.omd_id
    WHERE up.id = auth.uid()
      AND up.role = 'omd_admin'
      AND b.id = business_analytics.business_id
      AND up.omd_id IS NOT NULL
  )
);

-- Super admins can view all analytics
CREATE POLICY "Super admins can view all analytics"
ON business_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  )
);

-- Business owners can view analytics for their own businesses
CREATE POLICY "Business owners can view their own analytics"
ON business_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_analytics.business_id
      AND owner_id = auth.uid()
  )
);

-- =============================================
-- 6. CREATE RLS POLICIES FOR business_revenue
-- =============================================

-- Enable RLS
ALTER TABLE business_revenue ENABLE ROW LEVEL SECURITY;

-- OMD admins can view all revenue for their OMD's businesses
CREATE POLICY "OMD admins can view revenue for their OMD"
ON business_revenue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN businesses b ON b.omd_id = up.omd_id
    WHERE up.id = auth.uid()
      AND up.role = 'omd_admin'
      AND b.id = business_revenue.business_id
      AND up.omd_id IS NOT NULL
  )
);

-- Super admins can view all revenue
CREATE POLICY "Super admins can view all revenue"
ON business_revenue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  )
);

-- Business owners can view revenue for their own businesses
CREATE POLICY "Business owners can view their own revenue"
ON business_revenue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_revenue.business_id
      AND owner_id = auth.uid()
  )
);

-- Allow system to insert revenue records (via triggers)
CREATE POLICY "System can insert revenue records"
ON business_revenue
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow system to update revenue records
CREATE POLICY "System can update revenue records"
ON business_revenue
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================
-- 7. HELPER FUNCTION: Track analytics event
-- =============================================
CREATE OR REPLACE FUNCTION track_analytics_event(
  p_business_id UUID,
  p_event_type TEXT,
  p_session_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_revenue_amount DECIMAL DEFAULT NULL,
  p_currency TEXT DEFAULT 'EUR'
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO business_analytics (
    business_id,
    event_type,
    session_id,
    user_id,
    ip_address,
    user_agent,
    referrer,
    page_url,
    metadata,
    revenue_amount,
    currency
  ) VALUES (
    p_business_id,
    p_event_type,
    p_session_id,
    p_user_id,
    p_ip_address,
    p_user_agent,
    p_referrer,
    p_page_url,
    p_metadata,
    p_revenue_amount,
    p_currency
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. HELPER FUNCTION: Track revenue
-- =============================================
CREATE OR REPLACE FUNCTION track_business_revenue(
  p_business_id UUID,
  p_source_type TEXT,
  p_source_id UUID,
  p_gross_amount DECIMAL,
  p_fees DECIMAL DEFAULT 0,
  p_check_in_date DATE DEFAULT NULL,
  p_check_out_date DATE DEFAULT NULL,
  p_booking_date DATE DEFAULT NULL,
  p_payment_status TEXT DEFAULT 'pending',
  p_currency TEXT DEFAULT 'EUR'
)
RETURNS UUID AS $$
DECLARE
  v_record_id UUID;
  v_net_amount DECIMAL;
  v_year INTEGER;
  v_month INTEGER;
  v_target_date DATE;
BEGIN
  -- Calculate net amount
  v_net_amount := p_gross_amount - p_fees;
  
  -- Determine target date for year/month calculation
  v_target_date := COALESCE(p_booking_date, p_check_in_date, CURRENT_DATE);
  v_year := EXTRACT(YEAR FROM v_target_date)::INTEGER;
  v_month := EXTRACT(MONTH FROM v_target_date)::INTEGER;
  
  -- Insert revenue record
  INSERT INTO business_revenue (
    business_id,
    source_type,
    source_id,
    gross_amount,
    fees,
    net_amount,
    currency,
    check_in_date,
    check_out_date,
    booking_date,
    year,
    month,
    payment_status
  ) VALUES (
    p_business_id,
    p_source_type,
    p_source_id,
    p_gross_amount,
    p_fees,
    v_net_amount,
    p_currency,
    p_check_in_date,
    p_check_out_date,
    p_booking_date,
    v_year,
    v_month,
    p_payment_status
  )
  RETURNING id INTO v_record_id;
  
  RETURN v_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. CREATE TRIGGER: Auto-track revenue for hotel reservations
-- =============================================
CREATE OR REPLACE FUNCTION auto_track_hotel_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track for completed bookings (status = 'confirmed')
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    PERFORM track_business_revenue(
      p_business_id := (SELECT business_id FROM rooms WHERE id = NEW.room_id),
      p_source_type := 'hotel_reservation',
      p_source_id := NEW.id,
      p_gross_amount := NEW.total_price,
      p_check_in_date := NEW.check_in,
      p_check_out_date := NEW.check_out,
      p_payment_status := 'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_track_hotel_revenue ON reservations;
CREATE TRIGGER trigger_auto_track_hotel_revenue
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION auto_track_hotel_revenue();

-- =============================================
-- 10. CREATE TRIGGER: Auto-track revenue for experience bookings
-- =============================================
CREATE OR REPLACE FUNCTION auto_track_experience_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track for completed bookings (status = 'confirmed')
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    PERFORM track_business_revenue(
      p_business_id := (SELECT business_id FROM experiences WHERE id = NEW.experience_id),
      p_source_type := 'experience_booking',
      p_source_id := NEW.id,
      p_gross_amount := NEW.total_price,
      p_booking_date := NEW.booking_date,
      p_payment_status := COALESCE(NEW.payment_status, 'pending')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_track_experience_revenue ON experience_bookings;
CREATE TRIGGER trigger_auto_track_experience_revenue
  AFTER INSERT OR UPDATE ON experience_bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_track_experience_revenue();

-- Note: Restaurant orders can be added later when order system is implemented

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check tables were created
SELECT 
  'Tables' as check_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('business_analytics', 'business_revenue');

-- Check indexes were created
SELECT 
  'Indexes' as check_type,
  COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('business_analytics', 'business_revenue');

-- Check triggers were created
SELECT 
  'Triggers' as check_type,
  COUNT(*) as count
FROM pg_trigger
WHERE tgrelid IN (
  'reservations'::regclass,
  'experience_bookings'::regclass
);

-- =============================================
-- END OF MIGRATION
-- =============================================

