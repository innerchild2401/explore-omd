# 🍽️ Restaurant System Implementation Plan

## Overview
This document outlines the complete implementation plan for the restaurant system, including database schema, admin dashboard, menu management, and reservation system.

## 📋 Database Schema

### 1. Restaurants Table
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  
  -- Core Details
  cuisine_type TEXT NOT NULL,
  price_range TEXT NOT NULL CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
  dining_style TEXT,
  description TEXT,
  
  -- Capacity & Layout
  total_capacity INTEGER NOT NULL,
  table_configuration JSONB, -- {"2_person": 10, "4_person": 15, "6_person": 5}
  has_outdoor_seating BOOLEAN DEFAULT false,
  has_private_dining BOOLEAN DEFAULT false,
  has_bar_seating BOOLEAN DEFAULT false,
  
  -- Operating Hours
  operating_hours JSONB NOT NULL, -- {"monday": {"open": "11:00", "close": "22:00"}}
  special_hours JSONB, -- Holiday hours, etc.
  
  -- Policies
  reservation_policy JSONB, -- Min/max party, advance booking limit
  dress_code TEXT,
  age_restrictions TEXT,
  pet_policy TEXT,
  
  -- Amenities
  amenities TEXT[], -- Array of amenity names
  
  -- Menu Info
  menu_type TEXT,
  avg_price_per_person JSONB, -- {"min": 25, "max": 45}
  dietary_accommodations TEXT[],
  
  -- Social Media
  social_media JSONB, -- {"instagram": "@restaurant", "facebook": "restaurant"}
  
  -- Reservation Settings
  booking_window_days INTEGER DEFAULT 30,
  time_slot_interval INTEGER DEFAULT 30, -- minutes
  min_party_size INTEGER DEFAULT 1,
  max_party_size INTEGER DEFAULT 8,
  requires_deposit BOOLEAN DEFAULT false,
  deposit_threshold INTEGER, -- Party size requiring deposit
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Menu Categories Table
```sql
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Menu Items Table
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  category_id UUID REFERENCES menu_categories(id),
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[],
  price DECIMAL(10,2) NOT NULL,
  
  -- Nutritional Values
  calories INTEGER,
  protein DECIMAL(5,2), -- grams
  carbs DECIMAL(5,2), -- grams
  fat DECIMAL(5,2), -- grams
  fiber DECIMAL(5,2), -- grams
  sugar DECIMAL(5,2), -- grams
  sodium DECIMAL(5,2), -- mg
  
  -- Dietary Information
  dietary_tags TEXT[], -- ["vegetarian", "vegan", "gluten-free", "dairy-free"]
  allergens TEXT[], -- ["nuts", "dairy", "gluten", "soy"]
  spice_level INTEGER CHECK (spice_level BETWEEN 1 AND 5), -- 1=mild, 5=very hot
  
  -- Display & Availability
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Images
  images TEXT[], -- Array of image URLs
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Restaurant Tables Table
```sql
CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  
  -- Table Details
  table_number TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  table_type TEXT, -- "indoor", "outdoor", "bar", "private"
  location_description TEXT, -- "Near window", "Corner booth", etc.
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  is_reservable BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(restaurant_id, table_number)
);
```

### 5. Restaurant Reservations Table
```sql
CREATE TABLE restaurant_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  table_id UUID REFERENCES restaurant_tables(id),
  guest_id UUID REFERENCES guest_profiles(id),
  channel_id UUID REFERENCES booking_channels(id),
  
  -- Reservation Details
  confirmation_number TEXT UNIQUE NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL,
  duration_minutes INTEGER DEFAULT 120, -- Default 2 hours
  
  -- Status
  reservation_status TEXT DEFAULT 'tentative' CHECK (reservation_status IN ('tentative', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  
  -- Special Requests
  special_requests TEXT,
  occasion TEXT, -- "birthday", "anniversary", "business", etc.
  
  -- Contact Info
  guest_phone TEXT,
  guest_email TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);
```

## 🎯 Admin Dashboard Components

### 1. RestaurantBasicInfo.tsx
```typescript
interface RestaurantBasicInfoProps {
  restaurantId: string;
}

// Form sections:
// - Core Details (name, cuisine, price range, description)
// - Contact & Location (address, phone, email, website)
// - Operating Hours (daily hours, special hours)
// - Capacity & Layout (total capacity, table configuration)
// - Policies (reservation policy, dress code, age restrictions)
// - Amenities (checkboxes for various amenities)
// - Social Media (Instagram, Facebook, Twitter handles)
// - Images (restaurant photos, logo)
```

### 2. MenuManager.tsx
```typescript
interface MenuManagerProps {
  restaurantId: string;
}

// Features:
// - Category management (create, edit, reorder, delete)
// - Menu item management (create, edit, delete, reorder)
// - CSV upload with template download
// - Bulk operations (activate/deactivate, price updates)
// - Nutritional information management
// - Image upload for menu items
// - Dietary tags and allergen management
```

### 3. TableManagement.tsx
```typescript
interface TableManagementProps {
  restaurantId: string;
}

// Features:
// - Add/edit/delete tables
// - Set table capacity and type
// - Configure table availability
// - Visual table layout (optional)
// - Table status management
```

### 4. ReservationManagement.tsx
```typescript
interface ReservationManagementProps {
  restaurantId: string;
}

// Features:
// - View all reservations (pending, confirmed, seated, completed)
// - Filter by date, status, party size
// - Assign tables to reservations
// - Handle walk-ins
// - Manage special requests
// - Send confirmation emails/SMS
// - Handle cancellations and no-shows
```

### 5. RestaurantDashboard.tsx
```typescript
interface RestaurantDashboardProps {
  restaurantId: string;
}

// Tabs:
// - Overview (stats, recent reservations, quick actions)
// - Basic Info (restaurant details)
// - Menu Management
// - Table Management
// - Reservations
// - Analytics (optional)
```

## 📊 Menu Management Features

### 1. Manual Menu Input
- **Category Management**: Create/edit/delete categories with descriptions
- **Item Management**: Add items with full details (name, description, ingredients, price, nutritional info)
- **Drag & Drop Reordering**: Reorder categories and items within categories
- **Bulk Operations**: Activate/deactivate multiple items, bulk price updates
- **Image Management**: Upload multiple images per item
- **Dietary Tags**: Checkboxes for vegetarian, vegan, gluten-free, etc.
- **Allergen Management**: Select allergens (nuts, dairy, gluten, soy, etc.)

### 2. CSV Upload System
- **Template Download**: Provide CSV template with all required columns
- **Validation**: Check for required fields, valid data types, duplicate names
- **Preview**: Show preview before importing
- **Error Handling**: Highlight errors and allow corrections
- **Batch Import**: Import entire menu at once

### 3. CSV Template Structure
```csv
category_name,category_description,item_name,item_description,ingredients,price,calories,protein,carbs,fat,fiber,sugar,sodium,dietary_tags,allergens,spice_level,is_featured
Appetizers,Start your meal with our delicious appetizers,Bruschetta,Toasted bread with fresh tomatoes and basil,"Tomatoes, Basil, Olive Oil, Garlic, Bread",12.99,180,6.5,25.2,4.8,2.1,3.2,320,"vegetarian,gluten-free","gluten",1,true
Main Courses,Our signature main dishes,Grilled Salmon,Atlantic salmon with lemon herb butter,"Salmon, Lemon, Butter, Herbs, Salt, Pepper",24.99,320,28.5,2.1,18.2,0.5,1.2,450,"gluten-free,dairy-free","fish",1,false
```

## 🔧 Implementation Steps

### Phase 1: Database Setup
1. Create restaurant tables migration
2. Add RLS policies for restaurants
3. Create menu-related tables
4. Set up table management tables
5. Create reservation tables

### Phase 2: Admin Dashboard
1. Create RestaurantDashboard component
2. Implement RestaurantBasicInfo form
3. Build MenuManager with manual input
4. Create TableManagement interface
5. Build ReservationManagement system

### Phase 3: Menu Management
1. Implement category management
2. Build menu item CRUD operations
3. Add CSV upload functionality
4. Create template download system
5. Add image upload for menu items
6. Implement nutritional information management

### Phase 4: Public Pages
1. Create restaurants listing page (`/[omdSlug]/restaurants`)
2. Build restaurant detail page (`/[omdSlug]/restaurants/[restaurantSlug]`)
3. Implement reservation booking system
4. Add menu display on public pages
5. Create search and filtering functionality

### Phase 5: Integration
1. Update business registration to handle restaurants
2. Modify explore page to show restaurant carousel
3. Update search bar to handle restaurant searches
4. Add restaurant-specific RLS policies
5. Test end-to-end functionality

## 📁 File Structure

```
components/
├── restaurant/
│   ├── RestaurantDashboard.tsx
│   ├── RestaurantBasicInfo.tsx
│   ├── MenuManager.tsx
│   ├── MenuCategoryEditor.tsx
│   ├── MenuItemEditor.tsx
│   ├── TableManagement.tsx
│   ├── ReservationManagement.tsx
│   └── CSVUploadModal.tsx
├── restaurants/
│   ├── RestaurantCard.tsx
│   ├── MenuDisplay.tsx
│   ├── MenuItemCard.tsx
│   ├── ReservationForm.tsx
│   └── RestaurantInfo.tsx
└── sections/
    └── RestaurantCarousel.tsx

app/
├── [omdSlug]/
│   ├── restaurants/
│   │   ├── page.tsx
│   │   └── [restaurantSlug]/
│   │       └── page.tsx
└── business/
    └── restaurant/
        └── dashboard/
            └── page.tsx

migrations/
└── 37_restaurant_system.sql
```

## 🎨 UI/UX Considerations

### Admin Dashboard
- **Clean Interface**: Similar to hotel dashboard but restaurant-focused
- **Quick Actions**: Add reservation, update menu, manage tables
- **Real-time Updates**: Live reservation status updates
- **Mobile Responsive**: Restaurant owners often manage on mobile

### Public Pages
- **Appetizing Design**: High-quality food photography
- **Easy Navigation**: Clear menu categories and items
- **Reservation Flow**: Simple, step-by-step booking process
- **Mobile-First**: Most restaurant searches happen on mobile

### Menu Display
- **Visual Appeal**: Large, appetizing food photos
- **Clear Pricing**: Prominent price display
- **Dietary Info**: Clear dietary tags and allergen warnings
- **Descriptions**: Enticing item descriptions

## 🔒 Security & RLS Policies

### Restaurant Owners
- Can manage their own restaurant data
- Can view/edit their menu items
- Can manage their tables and reservations
- Can update their restaurant information

### Anonymous Users
- Can view restaurant information
- Can view menus
- Can make reservations
- Can read restaurant details

### OMD Admins
- Can view all restaurants in their OMD
- Can manage restaurant approvals
- Can view reservation analytics

## 📈 Future Enhancements

### Phase 6: Advanced Features
1. **Online Ordering**: Integration with delivery platforms
2. **Loyalty Program**: Points and rewards system
3. **Event Management**: Special events and private dining
4. **Analytics Dashboard**: Revenue, popular items, peak times
5. **Multi-location Support**: Chain restaurants
6. **Staff Management**: Employee scheduling and permissions
7. **Inventory Management**: Ingredient tracking and alerts
8. **Dynamic Pricing**: Time-based pricing for peak hours

### Phase 7: Integrations
1. **POS Integration**: Connect with existing POS systems
2. **Delivery Platforms**: Uber Eats, DoorDash integration
3. **Social Media**: Instagram, Facebook integration
4. **Review Platforms**: Yelp, Google Reviews integration
5. **Email Marketing**: Customer communication tools

## 🚀 Getting Started

1. **Review this plan** and make any necessary adjustments
2. **Create database migration** for restaurant tables
3. **Start with RestaurantDashboard** component
4. **Implement basic CRUD operations** for restaurants
5. **Build menu management system**
6. **Create public restaurant pages**
7. **Test thoroughly** before moving to next phase

This implementation plan provides a comprehensive roadmap for building a full-featured restaurant management system that rivals industry leaders like OpenTable and Resy! 🍽️

