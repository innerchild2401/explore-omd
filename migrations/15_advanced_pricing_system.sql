-- =============================================
-- ADVANCED PRICING SYSTEM
-- Migration: 15_advanced_pricing_system.sql
-- =============================================

-- =============================================
-- 1. ENHANCED ROOM PRICING TABLE
-- =============================================

-- Drop existing room_pricing table and recreate with advanced features
DROP TABLE IF EXISTS room_pricing CASCADE;

CREATE TABLE room_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  min_stay INTEGER DEFAULT 1,
  max_stay INTEGER, -- Optional maximum stay limit
  pricing_type TEXT DEFAULT 'custom' CHECK (pricing_type IN ('custom', 'template', 'dynamic')),
  template_id UUID, -- Reference to pricing templates
  color_code TEXT DEFAULT '#3B82F6', -- Hex color for calendar display
  notes TEXT, -- Additional notes for this pricing rule
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_stay_range CHECK (max_stay IS NULL OR max_stay >= min_stay)
);

-- =============================================
-- 2. PRICING TEMPLATES TABLE
-- =============================================

CREATE TABLE pricing_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Summer Season", "Holiday Rates"
  description TEXT,
  base_price_adjustment_type TEXT NOT NULL CHECK (base_price_adjustment_type IN ('percentage', 'fixed', 'multiplier')),
  base_price_adjustment_value DECIMAL(10,2) NOT NULL, -- +30%, -20%, or fixed amount
  color_code TEXT DEFAULT '#3B82F6',
  is_seasonal BOOLEAN DEFAULT false, -- True for recurring seasonal templates
  seasonal_start_month INTEGER CHECK (seasonal_start_month >= 1 AND seasonal_start_month <= 12),
  seasonal_start_day INTEGER CHECK (seasonal_start_day >= 1 AND seasonal_start_day <= 31),
  seasonal_end_month INTEGER CHECK (seasonal_end_month >= 1 AND seasonal_end_month <= 12),
  seasonal_end_day INTEGER CHECK (seasonal_end_day >= 1 AND seasonal_end_day <= 31),
  min_stay INTEGER DEFAULT 1,
  max_stay INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. PRICING RULES TABLE (for complex logic)
-- =============================================

CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('advance_booking', 'last_minute', 'occupancy_based', 'day_of_week', 'length_of_stay')),
  conditions JSONB NOT NULL, -- Flexible conditions storage
  price_adjustment_type TEXT NOT NULL CHECK (price_adjustment_type IN ('percentage', 'fixed', 'multiplier')),
  price_adjustment_value DECIMAL(10,2) NOT NULL,
  priority INTEGER DEFAULT 0, -- Higher priority rules apply first
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. PRICING ANALYTICS TABLE
-- =============================================

CREATE TABLE pricing_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,
  pricing_rule_id UUID REFERENCES pricing_rules(id),
  template_id UUID REFERENCES pricing_templates(id),
  occupancy_rate DECIMAL(5,2), -- Percentage occupancy
  competitor_avg_price DECIMAL(10,2),
  demand_score INTEGER CHECK (demand_score >= 1 AND demand_score <= 10),
  revenue_impact DECIMAL(10,2), -- Calculated revenue impact
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, date)
);

-- =============================================
-- 5. PRICING CONFLICTS TABLE
-- =============================================

CREATE TABLE pricing_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('overlap', 'gap', 'invalid_range')),
  conflicting_pricing_ids UUID[] NOT NULL, -- Array of conflicting pricing rule IDs
  conflict_date_range DATERANGE NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- =============================================
-- 6. INDEXES FOR PERFORMANCE
-- =============================================

-- Room pricing indexes
CREATE INDEX idx_room_pricing_room_id ON room_pricing(room_id);
CREATE INDEX idx_room_pricing_dates ON room_pricing(start_date, end_date);
CREATE INDEX idx_room_pricing_active ON room_pricing(is_active) WHERE is_active = true;
CREATE INDEX idx_room_pricing_type ON room_pricing(pricing_type);

-- Pricing templates indexes
CREATE INDEX idx_pricing_templates_hotel_id ON pricing_templates(hotel_id);
CREATE INDEX idx_pricing_templates_seasonal ON pricing_templates(is_seasonal) WHERE is_seasonal = true;

-- Pricing rules indexes
CREATE INDEX idx_pricing_rules_hotel_id ON pricing_rules(hotel_id);
CREATE INDEX idx_pricing_rules_priority ON pricing_rules(priority DESC);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active) WHERE is_active = true;

-- Analytics indexes
CREATE INDEX idx_pricing_analytics_room_date ON pricing_analytics(room_id, date);
CREATE INDEX idx_pricing_analytics_date ON pricing_analytics(date);

-- Conflicts indexes
CREATE INDEX idx_pricing_conflicts_room_id ON pricing_conflicts(room_id);
CREATE INDEX idx_pricing_conflicts_resolved ON pricing_conflicts(is_resolved) WHERE is_resolved = false;

-- =============================================
-- 7. FUNCTIONS FOR PRICING CALCULATIONS
-- =============================================

-- Function to calculate final price for a room on a specific date
CREATE OR REPLACE FUNCTION calculate_room_price(
  p_room_id UUID,
  p_date DATE
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  base_price DECIMAL(10,2);
  final_price DECIMAL(10,2);
  pricing_rule RECORD;
BEGIN
  -- Get base price from rooms table
  SELECT base_price INTO base_price
  FROM rooms
  WHERE id = p_room_id;
  
  IF base_price IS NULL THEN
    RETURN NULL;
  END IF;
  
  final_price := base_price;
  
  -- Check for specific pricing rules for this date
  SELECT * INTO pricing_rule
  FROM room_pricing
  WHERE room_id = p_room_id
    AND p_date >= start_date
    AND p_date <= end_date
    AND is_active = true
  ORDER BY (end_date - start_date) ASC -- Most specific (shortest) range first
  LIMIT 1;
  
  IF FOUND THEN
    final_price := pricing_rule.price_per_night;
  END IF;
  
  RETURN final_price;
END;
$$ LANGUAGE plpgsql;

-- Function to detect pricing conflicts
CREATE OR REPLACE FUNCTION detect_pricing_conflicts(p_room_id UUID)
RETURNS VOID AS $$
DECLARE
  conflict_record RECORD;
BEGIN
  -- Clear existing conflicts for this room
  DELETE FROM pricing_conflicts WHERE room_id = p_room_id;
  
  -- Detect overlapping pricing rules
  FOR conflict_record IN
    SELECT 
      p1.id as id1,
      p2.id as id2,
      GREATEST(p1.start_date, p2.start_date) as overlap_start,
      LEAST(p1.end_date, p2.end_date) as overlap_end
    FROM room_pricing p1
    JOIN room_pricing p2 ON p1.room_id = p2.room_id
    WHERE p1.id < p2.id
      AND p1.is_active = true
      AND p2.is_active = true
      AND p1.start_date <= p2.end_date
      AND p2.start_date <= p1.end_date
  LOOP
    INSERT INTO pricing_conflicts (
      room_id,
      conflict_type,
      conflicting_pricing_ids,
      conflict_date_range,
      severity,
      message
    ) VALUES (
      p_room_id,
      'overlap',
      ARRAY[conflict_record.id1, conflict_record.id2],
      DATERANGE(conflict_record.overlap_start, conflict_record.overlap_end),
      'warning',
      'Overlapping pricing rules detected'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all pricing tables
CREATE TRIGGER update_room_pricing_updated_at
  BEFORE UPDATE ON room_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_templates_updated_at
  BEFORE UPDATE ON pricing_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to detect conflicts when pricing rules are added/updated
CREATE OR REPLACE FUNCTION trigger_detect_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM detect_pricing_conflicts(NEW.room_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detect_pricing_conflicts_trigger
  AFTER INSERT OR UPDATE ON room_pricing
  FOR EACH ROW
  EXECUTE FUNCTION trigger_detect_conflicts();

-- =============================================
-- 9. ROW LEVEL SECURITY POLICIES
-- =============================================

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
USING (is_active = true);

-- Pricing Templates
ALTER TABLE pricing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can manage pricing templates"
ON pricing_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    JOIN businesses b ON h.business_id = b.id
    WHERE h.id = pricing_templates.hotel_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view pricing templates"
ON pricing_templates
FOR SELECT
TO public
USING (is_active = true);

-- Pricing Rules
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can manage pricing rules"
ON pricing_rules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    JOIN businesses b ON h.business_id = b.id
    WHERE h.id = pricing_rules.hotel_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view pricing rules"
ON pricing_rules
FOR SELECT
TO public
USING (is_active = true);

-- Pricing Analytics
ALTER TABLE pricing_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can view pricing analytics"
ON pricing_analytics
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.id = pricing_analytics.room_id
    AND b.owner_id = auth.uid()
  )
);

-- Pricing Conflicts
ALTER TABLE pricing_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel owners can manage pricing conflicts"
ON pricing_conflicts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.id = pricing_conflicts.room_id
    AND b.owner_id = auth.uid()
  )
);

-- =============================================
-- 10. SAMPLE DATA FOR TESTING
-- =============================================

-- Insert sample pricing templates
INSERT INTO pricing_templates (hotel_id, name, description, base_price_adjustment_type, base_price_adjustment_value, color_code, min_stay)
SELECT 
  h.id,
  'Summer Season',
  'Peak summer pricing with higher rates',
  'percentage',
  30.00,
  '#F59E0B',
  2
FROM hotels h
LIMIT 1;

INSERT INTO pricing_templates (hotel_id, name, description, base_price_adjustment_type, base_price_adjustment_value, color_code, min_stay)
SELECT 
  h.id,
  'Holiday Rates',
  'Premium pricing for holidays and special events',
  'percentage',
  50.00,
  '#EF4444',
  3
FROM hotels h
LIMIT 1;

INSERT INTO pricing_templates (hotel_id, name, description, base_price_adjustment_type, base_price_adjustment_value, color_code, min_stay)
SELECT 
  h.id,
  'Low Season',
  'Discounted rates for off-peak periods',
  'percentage',
  -20.00,
  '#10B981',
  1
FROM hotels h
LIMIT 1;

-- =============================================
-- 11. VERIFICATION QUERIES
-- =============================================

-- Verify the new schema
SELECT 
  'room_pricing' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'room_pricing'

UNION ALL

SELECT 
  'pricing_templates' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'pricing_templates'

UNION ALL

SELECT 
  'pricing_rules' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'pricing_rules'

UNION ALL

SELECT 
  'pricing_analytics' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'pricing_analytics'

UNION ALL

SELECT 
  'pricing_conflicts' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'pricing_conflicts';

-- Test the pricing calculation function
SELECT 
  r.name as room_name,
  r.base_price,
  calculate_room_price(r.id, CURRENT_DATE) as calculated_price
FROM rooms r
LIMIT 3;
