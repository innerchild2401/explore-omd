# Hotel Management System - Comprehensive Documentation

## Table of Contents
1. [Database Schema](#database-schema)
2. [Core Tables & Relationships](#core-tables--relationships)
3. [Hotel Registration & Setup](#hotel-registration--setup)
4. [Room Management](#room-management)
5. [Booking & Reservation System](#booking--reservation-system)
6. [Availability Management](#availability-management)
7. [Admin Dashboard](#admin-dashboard)
8. [Public Booking Flow](#public-booking-flow)
9. [API Functions](#api-functions)
10. [File Structure](#file-structure)

---

## Database Schema

### Core Tables Overview

#### 1. **OMDs** (Organizations/Markets)
- **Purpose**: Top-level organization (e.g., "Mangalia", "Constanta")
- **Key Fields**: `id`, `name`, `slug`
- **Relationships**: One-to-many with `businesses`

#### 2. **Businesses** (Hotel Business Entity)
- **Purpose**: Represents a hotel business within an OMD
- **Key Fields**: 
  - `id`, `omd_id`, `type` (always 'hotel')
  - `name`, `slug`, `description`
  - `location` (JSONB: address, coordinates)
  - `contact` (JSONB: phone, email, name)
  - `images` (Array of image URLs)
  - `rating`, `status`, `owner_id`
- **Relationships**: 
  - Belongs to: `omds`
  - Has one: `hotels`
  - Owned by: `user_profiles`

#### 3. **Hotels** (Hotel-Specific Data)
- **Purpose**: Hotel-specific information and settings
- **Key Fields**:
  - `id`, `business_id`
  - `property_subtype` ('hotel')
  - `star_rating`, `check_in_time`, `check_out_time`
  - `languages_spoken` (Array)
  - `selected_amenities` (Array of amenity IDs)
  - `policies` (JSONB)
  - `location_highlights` (Text)
- **Relationships**:
  - Belongs to: `businesses`
  - Has many: `rooms`, `reservations`

#### 4. **Rooms** (Room Types)
- **Purpose**: Defines room types and their properties
- **Key Fields**:
  - `id`, `hotel_id`
  - `name`, `room_type` ('single', 'double', 'suite')
  - `description`, `max_occupancy`
  - `quantity` (total rooms of this type)
  - `base_price`, `min_stay_nights`
  - `is_active`
- **Relationships**:
  - Belongs to: `hotels`
  - Has many: `individual_rooms`, `reservations`

#### 5. **Individual_Rooms** (Specific Room Instances)
- **Purpose**: Individual room instances (e.g., "Room 101", "Room 102")
- **Key Fields**:
  - `id`, `room_id` (references room type)
  - `room_number`, `floor_number`
  - `current_status` ('available', 'occupied', 'maintenance')
- **Relationships**:
  - Belongs to: `rooms`
  - Referenced by: `reservations.individual_room_id`

#### 6. **Reservations** (Booking Records)
- **Purpose**: All booking records (tentative and confirmed)
- **Key Fields**:
  - `id`, `hotel_id`, `room_id`, `individual_room_id`
  - `guest_id`, `channel_id`
  - `confirmation_number`, `reservation_status`
  - `check_in_date`, `check_out_date`
  - `adults`, `children`, `total_price`
  - `payment_status`, `special_requests`
- **Relationships**:
  - Belongs to: `hotels`, `rooms`, `individual_rooms`
  - References: `guest_profiles`, `booking_channels`

#### 7. **Guest_Profiles** (Customer Information)
- **Purpose**: Customer/guest information
- **Key Fields**:
  - `id`, `first_name`, `last_name`
  - `email`, `phone`, `address`
- **Relationships**:
  - Has many: `reservations`

#### 8. **Booking_Channels** (Booking Sources)
- **Purpose**: Track where bookings come from
- **Key Fields**:
  - `id`, `name` ('website', 'direct', 'phone')
  - `display_name`, `channel_type`
- **Relationships**:
  - Has many: `reservations`

#### 9. **Room_Availability** (Availability Tracking)
- **Purpose**: Track room availability by date
- **Key Fields**:
  - `id`, `room_id`, `date`
  - `available_quantity`, `reservation_id`
- **Relationships**:
  - Belongs to: `rooms`
  - References: `reservations`

---

## Hotel Registration & Setup

### 1. Business Registration Flow
**File**: `app/[omdSlug]/register-business/page.tsx`

**Process**:
1. User fills business registration form
2. Creates `businesses` record with `type: 'hotel'`
3. Creates `hotels` record linked to business
4. Sets up initial room types and amenities

**Key Components**:
- `components/sections/BusinessCarousel.tsx` - Registration form
- `components/business/HotelBasicInfo.tsx` - Hotel setup form

### 2. Hotel Onboarding
**File**: `app/[omdSlug]/business/onboarding/page.tsx`

**Steps**:
1. **Basic Info**: Hotel name, description, contact
2. **Images**: Upload hotel photos
3. **Amenities**: Select from OMD amenities
4. **Rooms**: Define room types and pricing
5. **Policies**: Set check-in/out times, policies

---

## Room Management

### 1. Room Types Setup
**File**: `components/business/RoomModal.tsx`

**Features**:
- Create/edit room types
- Set pricing, occupancy, minimum stay
- Upload room images
- Define room descriptions

### 2. Individual Rooms Management
**File**: `components/business/IndividualRoomsManager.tsx`

**Features**:
- Create individual room instances
- Set room numbers and floor numbers
- Manage room status (available/occupied/maintenance)
- Bulk room creation from room types

### 3. Pricing Management
**File**: `components/business/PricingCalendar.tsx`

**Features**:
- Seasonal pricing rules
- Dynamic pricing by date
- Minimum stay requirements
- Special rates and discounts

---

## Booking & Reservation System

### 1. Reservation Statuses
- **`tentative`**: Website bookings awaiting admin approval
- **`confirmed`**: Admin-approved bookings with assigned rooms
- **`checked_in`**: Guest has arrived
- **`checked_out`**: Guest has departed
- **`cancelled`**: Cancelled reservations

### 2. Booking Channels
- **`website`**: Public website bookings
- **`direct`**: Admin-created bookings
- **`phone`**: Phone bookings
- **`walk_in`**: Walk-in guests

### 3. Reservation Workflow

#### Public Booking (Website)
1. **Guest fills form**: `components/hotels/BookingModal.tsx`
2. **Creates guest profile**: If doesn't exist
3. **Creates tentative reservation**: Status = 'tentative'
4. **Admin notification**: Toast shows pending count
5. **Admin approval**: Changes status to 'confirmed'
6. **Room assignment**: Admin assigns specific room

#### Admin Booking (Dashboard)
1. **Admin creates reservation**: `components/business/NewReservationModal.tsx`
2. **Immediate confirmation**: Status = 'confirmed'
3. **Room assignment**: During creation
4. **Guest profile**: Created or linked

---

## Availability Management

### 1. Availability Functions

#### `check_hotel_availability_simple_bookings`
**Purpose**: Check if hotel has available rooms for dates
**Parameters**: `p_hotel_id`, `p_check_in`, `p_check_out`, `p_adults`, `p_children`
**Logic**:
- Counts rooms with sufficient occupancy
- Checks against existing confirmed reservations
- Returns `true` if any rooms available

#### `get_hotel_room_availability`
**Purpose**: Get detailed availability for each room type
**Returns**: Room availability, pricing, minimum stay info

### 2. Room Availability Tracking
**Table**: `room_availability`
- Tracks available quantity per room type per date
- Updated when reservations are created/cancelled
- Used for inventory management

---

## Admin Dashboard

### 1. Hotel Dashboard
**File**: `components/business/HotelDashboard.tsx`

**Tabs**:
- **Info**: Basic hotel information
- **Rooms**: Room management
- **Pricing**: Pricing calendar
- **Availability**: Room availability dashboard
- **Pending Reservations** ⏳: Tentative bookings (with toast notification)
- **Bookings**: Confirmed reservations
- **Individual Rooms**: Room instance management

### 2. Pending Reservations Management
**File**: `components/business/PendingReservations.tsx`

**Features**:
- View tentative bookings
- Approve/reject reservations
- Assign rooms during approval
- Guest contact information

### 3. Booking Management
**File**: `components/business/BookingManagement.tsx`

**Features**:
- View confirmed bookings
- Check-in/check-out management
- Room reassignment
- Reservation modifications

### 4. Toast Notifications
**File**: `components/business/ToastNotification.tsx`

**Purpose**: Shows count of pending reservations with bounce animation

---

## Public Booking Flow

### 1. Hotel Search & Discovery
**File**: `app/[omdSlug]/hotels/page.tsx`

**Features**:
- Date-based hotel filtering
- Availability checking
- Hotel cards with pricing
- Search parameters in URL

### 2. Hotel Detail Page
**File**: `app/[omdSlug]/hotels/[hotelSlug]/page.tsx`

**Features**:
- Hotel information and images
- Room types with availability
- Pricing and booking buttons
- Search summary when dates selected

### 3. Room Cards
**File**: `components/hotels/RoomCard.tsx`

**Features**:
- Room information display
- Availability status
- Pricing (base + dynamic)
- "Book Now" button
- Minimum stay requirements

### 4. Booking Modal
**File**: `components/hotels/BookingModal.tsx`

**Features**:
- Guest information form
- Pre-filled dates from search
- Room selection
- Booking confirmation
- Success/error handling

---

## API Functions

### 1. Database Functions (RPC)

#### Availability Functions
```sql
-- Check hotel availability
check_hotel_availability_simple_bookings(
  p_hotel_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER,
  p_children INTEGER
) RETURNS BOOLEAN

-- Get room availability details
get_hotel_room_availability(
  p_hotel_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER,
  p_children INTEGER
) RETURNS TABLE (...)
```

#### Business Functions
```sql
-- Create business registration
create_business_registration(
  p_omd_id UUID,
  p_business_data JSONB,
  p_hotel_data JSONB
) RETURNS UUID
```

### 2. Row Level Security (RLS)

#### Anonymous Users (Public Booking)
- **`guest_profiles`**: INSERT, SELECT, UPDATE
- **`reservations`**: INSERT (tentative), SELECT
- **`booking_channels`**: INSERT, SELECT
- **`room_availability`**: INSERT, SELECT, UPDATE
- **`rooms`**: SELECT

#### Authenticated Users (Hotel Owners)
- **All tables**: Full access to own hotel data
- **Cross-hotel access**: Restricted by hotel ownership

---

## File Structure

### Frontend Components

#### Hotel Management
```
components/business/
├── HotelDashboard.tsx          # Main dashboard
├── HotelBasicInfo.tsx          # Hotel setup form
├── RoomModal.tsx              # Room type management
├── RoomsList.tsx              # Room types list
├── IndividualRoomsManager.tsx # Individual rooms
├── PricingCalendar.tsx        # Pricing management
├── AvailabilityDashboard.tsx  # Availability overview
├── IndividualRoomAvailabilityDashboard.tsx
├── BookingManagement.tsx      # Confirmed bookings
├── PendingReservations.tsx    # Tentative bookings
├── NewReservationModal.tsx    # Admin booking creation
└── ToastNotification.tsx     # Pending count notification
```

#### Public Hotel Display
```
components/hotels/
├── RoomCard.tsx              # Room display card
├── RoomCardSkeleton.tsx     # Loading skeleton
├── BookingModal.tsx         # Public booking form
├── ScrollToRoomsButton.tsx  # Scroll to rooms
├── ImageGallery.tsx         # Hotel images
├── AmenitiesList.tsx        # Amenities display
└── LandmarksList.tsx        # Nearby landmarks
```

#### Search & Discovery
```
components/sections/
├── SearchBar.tsx            # Homepage search
└── BusinessCarousel.tsx     # Registration form
```

### Pages

#### Public Pages
```
app/[omdSlug]/
├── hotels/
│   ├── page.tsx             # Hotels listing
│   └── [hotelSlug]/
│       └── page.tsx         # Hotel detail page
├── register-business/
│   └── page.tsx             # Business registration
└── business/
    ├── onboarding/
    │   └── page.tsx         # Hotel setup
    └── [businessSlug]/
        └── page.tsx         # Hotel dashboard
```

#### Admin Pages
```
app/admin/
├── businesses/
│   └── page.tsx             # Business management
└── sections/
    └── page.tsx             # OMD sections
```

### Database Migrations
```
migrations/
├── 00_initial_schema.sql
├── 01_fix_rls_policies.sql
├── 02_setup_storage.sql
├── 03_add_explore_section.sql
├── 04_business_registration_rls.sql
├── 05_hotel_management_system.sql
├── 06_fix_user_profiles_rls.sql
├── 07_auto_create_user_profile_trigger.sql
├── 08_fix_businesses_rls.sql
├── 09_business_registration_function.sql
├── 10_fix_function_permissions.sql
├── 11_fix_sections_rls_visibility.sql
├── 12_fix_user_profiles_infinite_recursion.sql
├── 13_add_businesses_owner_fkey.sql
├── 14_fix_images_schema.sql
├── 15_advanced_pricing_system.sql
├── 16_booking_availability_system.sql
├── 17_fix_guest_profiles_rls.sql
├── 18_simplify_guest_profiles_rls.sql
├── 19_fix_reservations_schema.sql
├── 20_fix_reservations_rls.sql
├── 21_temporary_permissive_rls.sql
├── 22_fix_reservations_rls_auth.sql
├── 23_fix_hotel_owner_reservations.sql
├── 24_fix_reservations_fkey.sql
├── 25_fix_booking_events_rls.sql
├── 26_add_room_availability_trigger.sql
├── 27_fix_guest_profiles_email_search.sql
├── 28_fix_room_availability_relationships.sql
├── 29_fix_trigger_reservation_id.sql
├── 30_fix_foreign_key_constraint.sql
└── 36_enhanced_hotel_availability.sql
```

---

## Key Workflows

### 1. Hotel Registration
1. User visits `/[omdSlug]/register-business`
2. Fills business information form
3. System creates `businesses` record
4. System creates `hotels` record
5. User completes onboarding with rooms, pricing, amenities

### 2. Public Booking
1. User searches hotels with dates
2. System filters by availability
3. User clicks hotel → hotel detail page
4. User clicks "Book Now" → booking modal
5. System creates `guest_profiles` and `reservations` (tentative)
6. Admin sees notification and approves
7. Admin assigns room → status becomes 'confirmed'

### 3. Admin Booking
1. Admin opens hotel dashboard
2. Clicks "New Reservation"
3. Fills guest and booking details
4. System creates `reservations` (confirmed)
5. Room automatically assigned

### 4. Check-in/Check-out
1. Guest arrives → Admin changes status to 'checked_in'
2. Guest departs → Admin changes status to 'checked_out'
3. Room becomes available for new bookings

---

## Security & Permissions

### Row Level Security (RLS)
- **Anonymous users**: Can create bookings, read hotel info
- **Authenticated users**: Full access to own hotel data
- **OMD admins**: Can view all hotels in their OMD
- **Super admins**: Full system access

### Data Validation
- **Server-side validation**: All forms validated on server
- **Client-side validation**: Real-time form validation
- **Database constraints**: Foreign keys, required fields
- **RLS policies**: Prevent unauthorized data access

---

## Performance Considerations

### 1. Database Indexing
- Primary keys on all tables
- Foreign key indexes
- Composite indexes on frequently queried fields

### 2. Caching
- Hotel data cached for 60 seconds (`revalidate = 60`)
- Image optimization with Next.js Image component
- Lazy loading for room cards

### 3. Query Optimization
- Efficient joins between related tables
- Pagination for large datasets
- Availability functions optimized for performance

---

## Future Enhancements

### Planned Features
1. **Advanced Pricing**: Dynamic pricing algorithms
2. **Inventory Management**: Real-time room tracking
3. **Guest Management**: Guest history and preferences
4. **Reporting**: Revenue and occupancy reports
5. **Mobile App**: Native mobile booking app
6. **Integration**: Channel manager integration
7. **Analytics**: Booking analytics and insights

### Technical Improvements
1. **Real-time Updates**: WebSocket for live availability
2. **Caching**: Redis for better performance
3. **Search**: Elasticsearch for advanced search
4. **Monitoring**: Application performance monitoring
5. **Testing**: Comprehensive test suite

---

This documentation covers the complete hotel management system as currently implemented. When returning to work on hotels after implementing restaurants, this guide will provide a comprehensive understanding of the system architecture, workflows, and implementation details.

