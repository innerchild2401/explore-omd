-- =============================================
-- RESTAURANT SYSTEM MIGRATION
-- Migration: 37_restaurant_system.sql
-- =============================================

-- =============================================
-- 1. CREATE MENU CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);

-- =============================================
-- 2. UPDATE MENU ITEMS TABLE (add missing columns)
-- =============================================
-- Add missing columns to menu_items if they don't exist
DO $$ 
BEGIN
    -- Add category_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'category_id') THEN
        ALTER TABLE menu_items ADD COLUMN category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL;
    END IF;
    
    -- Add ingredients column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'ingredients') THEN
        ALTER TABLE menu_items ADD COLUMN ingredients TEXT[];
    END IF;
    
    -- Add dietary_tags column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'dietary_tags') THEN
        ALTER TABLE menu_items ADD COLUMN dietary_tags TEXT[];
    END IF;
    
    -- Add spice_level column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'spice_level') THEN
        ALTER TABLE menu_items ADD COLUMN spice_level INTEGER CHECK (spice_level BETWEEN 1 AND 5);
    END IF;
    
    -- Add is_featured column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'is_featured') THEN
        ALTER TABLE menu_items ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
    
    -- Add images column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'images') THEN
        ALTER TABLE menu_items ADD COLUMN images TEXT[];
    END IF;
END $$;

-- =============================================
-- 3. CREATE RESTAURANT TABLES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  table_type TEXT CHECK (table_type IN ('indoor', 'outdoor', 'bar', 'private')),
  location_description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_reservable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number)
);

CREATE INDEX idx_restaurant_tables_restaurant_id ON restaurant_tables(restaurant_id);

-- =============================================
-- 4. UPDATE RESTAURANT RESERVATIONS TABLE (add missing columns)
-- =============================================
DO $$ 
BEGIN
    -- Add table_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_reservations' AND column_name = 'table_id') THEN
        ALTER TABLE restaurant_reservations ADD COLUMN table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL;
    END IF;
    
    -- Add confirmation_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_reservations' AND column_name = 'confirmation_number') THEN
        ALTER TABLE restaurant_reservations ADD COLUMN confirmation_number TEXT UNIQUE;
    END IF;
    
    -- Add duration_minutes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_reservations' AND column_name = 'duration_minutes') THEN
        ALTER TABLE restaurant_reservations ADD COLUMN duration_minutes INTEGER DEFAULT 120;
    END IF;
    
    -- Add occasion column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_reservations' AND column_name = 'occasion') THEN
        ALTER TABLE restaurant_reservations ADD COLUMN occasion TEXT;
    END IF;
    
    -- Add confirmed_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_reservations' AND column_name = 'confirmed_at') THEN
        ALTER TABLE restaurant_reservations ADD COLUMN confirmed_at TIMESTAMPTZ;
    END IF;
    
    -- Add cancelled_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_reservations' AND column_name = 'cancelled_at') THEN
        ALTER TABLE restaurant_reservations ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;
END $$;

-- =============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_tables_updated_at
  BEFORE UPDATE ON restaurant_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. RLS POLICIES
-- =============================================

-- Menu Categories
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their menu categories"
ON menu_categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    JOIN businesses b ON r.business_id = b.id
    WHERE r.id = menu_categories.restaurant_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view active menu categories"
ON menu_categories
FOR SELECT
TO public
USING (is_active = true);

-- Menu Items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their menu items"
ON menu_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = menu_items.restaurant_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view available menu items"
ON menu_items
FOR SELECT
TO public
USING (available = true);

-- Restaurant Tables
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage their tables"
ON restaurant_tables
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    JOIN businesses b ON r.business_id = b.id
    WHERE r.id = restaurant_tables.restaurant_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view active tables"
ON restaurant_tables
FOR SELECT
TO public
USING (is_active = true);

-- Restaurant Reservations
ALTER TABLE restaurant_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can view their reservations"
ON restaurant_reservations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    JOIN businesses b ON r.business_id = b.id
    WHERE r.id = restaurant_reservations.restaurant_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Customers can view their own reservations"
ON restaurant_reservations
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Anyone can create reservations"
ON restaurant_reservations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Customers can update their own reservations"
ON restaurant_reservations
FOR UPDATE
TO authenticated
USING (customer_id = auth.uid());
