-- Explore OMD Platform - Initial Database Schema
-- This file should be run in the Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- CORE TABLES
-- ============================================

-- OMDs (Organization Management for Destinations)
CREATE TABLE omds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    theme JSONB DEFAULT '{}',
    logo TEXT,
    colors JSONB DEFAULT '{"primary": "#000000", "secondary": "#ffffff"}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sections (Dynamic page sections)
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    is_visible BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Businesses (Hotels, Restaurants, Experiences)
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('hotel', 'restaurant', 'experience')),
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    images TEXT[] DEFAULT '{}',
    location JSONB NOT NULL DEFAULT '{}',
    contact JSONB DEFAULT '{}',
    rating DECIMAL(2,1) DEFAULT 0.0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
    owner_id UUID REFERENCES auth.users(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(omd_id, slug)
);

-- Translations
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    language TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, language)
);

-- User Profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('super_admin', 'omd_admin', 'business_owner', 'visitor')),
    omd_id UUID REFERENCES omds(id),
    profile JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HOTEL-SPECIFIC TABLES
-- ============================================

-- Hotel Rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    images TEXT[] DEFAULT '{}',
    amenities TEXT[] DEFAULT '{}',
    is_available BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotel Reservations
CREATE TABLE hotel_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RESTAURANT-SPECIFIC TABLES
-- ============================================

-- Menu Items
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    allergens TEXT[] DEFAULT '{}',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurant Orders
CREATE TABLE restaurant_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    total DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
    delivery_address TEXT,
    pickup_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurant Reservations
CREATE TABLE restaurant_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    guests INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EXPERIENCE-SPECIFIC TABLES
-- ============================================

-- Experience Availability
CREATE TABLE experience_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    capacity INTEGER NOT NULL,
    booked INTEGER DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(experience_id, date, time_slot)
);

-- Experience Bookings
CREATE TABLE experience_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    availability_id UUID NOT NULL REFERENCES experience_availability(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    participants INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CRM & COMMUNICATION TABLES
-- ============================================

-- Customers (Unified CRM)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    preferences JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, email)
);

-- Email Templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    omd_id UUID REFERENCES omds(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('booking_confirmation', 'reservation_confirmation', 'order_confirmation', 'cancellation', 'reminder', 'promotional')),
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Logs
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES email_templates(id),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REVIEWS & RATINGS
-- ============================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    customer_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_sections_omd_id ON sections(omd_id);
CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_sections_order ON sections(omd_id, order_index);

CREATE INDEX idx_businesses_omd_id ON businesses(omd_id);
CREATE INDEX idx_businesses_type ON businesses(type);
CREATE INDEX idx_businesses_slug ON businesses(slug);
CREATE INDEX idx_businesses_status ON businesses(status);

CREATE INDEX idx_translations_entity ON translations(entity_type, entity_id);
CREATE INDEX idx_translations_language ON translations(language);

CREATE INDEX idx_hotel_reservations_dates ON hotel_reservations(check_in, check_out);
CREATE INDEX idx_hotel_reservations_hotel ON hotel_reservations(hotel_id);

CREATE INDEX idx_restaurant_orders_restaurant ON restaurant_orders(restaurant_id);
CREATE INDEX idx_restaurant_reservations_restaurant ON restaurant_reservations(restaurant_id);
CREATE INDEX idx_restaurant_reservations_date ON restaurant_reservations(reservation_date);

CREATE INDEX idx_experience_availability_date ON experience_availability(date);
CREATE INDEX idx_experience_bookings_experience ON experience_bookings(experience_id);

CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_reviews_business ON reviews(business_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_omds_updated_at BEFORE UPDATE ON omds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hotel_reservations_updated_at BEFORE UPDATE ON hotel_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_orders_updated_at BEFORE UPDATE ON restaurant_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_reservations_updated_at BEFORE UPDATE ON restaurant_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_experience_availability_updated_at BEFORE UPDATE ON experience_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_experience_bookings_updated_at BEFORE UPDATE ON experience_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE omds ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public read access for OMDs
CREATE POLICY "OMDs are viewable by everyone" ON omds FOR SELECT USING (true);

-- Public read access for visible sections
CREATE POLICY "Sections are viewable by everyone" ON sections FOR SELECT USING (is_visible = true);

-- Public read access for active businesses
CREATE POLICY "Active businesses are viewable by everyone" ON businesses FOR SELECT USING (status = 'active');

-- Business owners can update their own businesses
CREATE POLICY "Business owners can update their businesses" ON businesses FOR UPDATE 
USING (owner_id = auth.uid());

-- Public read access for translations
CREATE POLICY "Translations are viewable by everyone" ON translations FOR SELECT USING (true);

-- Public read access for rooms of active hotels
CREATE POLICY "Rooms are viewable by everyone" ON rooms FOR SELECT 
USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = rooms.hotel_id AND businesses.status = 'active'));

-- Public read access for menu items of active restaurants
CREATE POLICY "Menu items are viewable by everyone" ON menu_items FOR SELECT 
USING (available = true AND EXISTS (SELECT 1 FROM businesses WHERE businesses.id = menu_items.restaurant_id AND businesses.status = 'active'));

-- Public read access for experience availability
CREATE POLICY "Experience availability is viewable by everyone" ON experience_availability FOR SELECT 
USING (is_available = true AND EXISTS (SELECT 1 FROM businesses WHERE businesses.id = experience_availability.experience_id AND businesses.status = 'active'));

-- Users can view their own reservations/bookings/orders
CREATE POLICY "Users can view their own hotel reservations" ON hotel_reservations FOR SELECT 
USING (guest_id = auth.uid() OR guest_email = auth.jwt()->>'email');

CREATE POLICY "Users can view their own restaurant orders" ON restaurant_orders FOR SELECT 
USING (customer_id = auth.uid() OR customer_email = auth.jwt()->>'email');

CREATE POLICY "Users can view their own restaurant reservations" ON restaurant_reservations FOR SELECT 
USING (customer_id = auth.uid() OR customer_email = auth.jwt()->>'email');

CREATE POLICY "Users can view their own experience bookings" ON experience_bookings FOR SELECT 
USING (customer_id = auth.uid() OR customer_email = auth.jwt()->>'email');

-- Anyone can create reservations/bookings/orders
CREATE POLICY "Anyone can create hotel reservations" ON hotel_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can create restaurant orders" ON restaurant_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can create restaurant reservations" ON restaurant_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can create experience bookings" ON experience_bookings FOR INSERT WITH CHECK (true);

-- Public read access for approved reviews
CREATE POLICY "Approved reviews are viewable by everyone" ON reviews FOR SELECT USING (status = 'approved');

-- Users can create reviews
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (true);

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Insert a default OMD
INSERT INTO omds (name, slug, theme, colors) VALUES
('Constanta Tourism', 'constanta', '{}', '{"primary": "#0066CC", "secondary": "#FFD700"}');

