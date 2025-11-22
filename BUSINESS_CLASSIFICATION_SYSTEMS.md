# Business Classification Systems - Current Usage

This document outlines all existing classification, labeling, and categorization systems used in the codebase to describe businesses and their features.

---

## 1. Core Business Classification

### `businesses.type`
- **Field Name**: `type`
- **Table**: `businesses`
- **Type**: ENUM/TEXT CHECK constraint
- **Values**: `'hotel'`, `'restaurant'`, `'experience'`
- **Purpose**: Primary business type classification
- **Used For**: Filtering, routing, business logic
- **Location**: `migrations/00_initial_schema.sql`

---

## 2. Business Status & Visibility

### `businesses.status`
- **Field Name**: `status`
- **Table**: `businesses`
- **Values**: `'active'`, `'inactive'`, `'pending'`
- **Purpose**: Business approval/activation status

### `businesses.is_published`
- **Field Name**: `is_published`
- **Table**: `businesses`
- **Type**: BOOLEAN
- **Purpose**: Controls public visibility

### `businesses.is_omd_member`
- **Field Name**: `is_omd_member`
- **Table**: `businesses`
- **Type**: BOOLEAN
- **Purpose**: Indicates OMD membership (shows badge)
- **Location**: `migrations/56_omd_member_badge.sql`

### `businesses.featured_order`
- **Field Name**: `featured_order`
- **Table**: `businesses`
- **Type**: INTEGER (1, 2, or 3, or NULL)
- **Purpose**: Featured ordering (1-3 shown first)
- **Location**: `migrations/57_business_featured_ordering.sql`

### `businesses.is_featured_for_emails`
- **Field Name**: `is_featured_for_emails`
- **Table**: `businesses`
- **Type**: BOOLEAN
- **Purpose**: Feature in post-checkin emails
- **Location**: `migrations/55_featured_businesses_for_emails.sql`

---

## 3. Geographic Classification

### `businesses.area_id`
- **Field Name**: `area_id`
- **Table**: `businesses`
- **Type**: UUID (FK to `areas.id`)
- **Purpose**: Geographic area within OMD
- **Related Table**: `areas` (id, omd_id, name, description, order_index)
- **Location**: `migrations/50_add_business_areas.sql`

---

## 4. Hotel-Specific Classifications

### `hotels.property_subtype`
- **Field Name**: `property_subtype`
- **Table**: `hotels`
- **Values**: `'hotel'`, `'bnb'`, `'guesthouse'`, `'hostel'`, `'resort'`, `'apartment'`
- **Purpose**: Hotel property type classification
- **Location**: `migrations/05_hotel_management_system.sql`

### `hotels.star_rating`
- **Field Name**: `star_rating`
- **Table**: `hotels`
- **Type**: INTEGER (1-5)
- **Purpose**: Hotel star rating

### `rooms.room_type`
- **Field Name**: `room_type`
- **Table**: `rooms`
- **Values**: `'single'`, `'double'`, `'twin'`, `'triple'`, `'quad'`, `'suite'`, `'studio'`, `'apartment'`
- **Purpose**: Room type classification
- **Location**: `migrations/05_hotel_management_system.sql`

---

## 5. Restaurant-Specific Classifications

### `restaurants.cuisine_type`
- **Field Name**: `cuisine_type`
- **Table**: `restaurants`
- **Type**: TEXT (free-form)
- **Purpose**: Cuisine type (e.g., "Italian", "Asian", "Mediterranean")

### `restaurants.price_range`
- **Field Name**: `price_range`
- **Table**: `restaurants`
- **Values**: `'$'`, `'$$'`, `'$$$'`, `'$$$$'`
- **Purpose**: Price range classification

### `menu_items.dietary_tags`
- **Field Name**: `dietary_tags`
- **Table**: `menu_items`
- **Type**: TEXT[]
- **Purpose**: Dietary tags (e.g., "vegan", "gluten-free", "halal")
- **Location**: `migrations/37_restaurant_system.sql`

### `menu_categories`
- **Table**: `menu_categories`
- **Fields**: id, restaurant_id, name, description, display_order, is_active
- **Purpose**: Menu item categorization
- **Location**: `migrations/37_restaurant_system.sql`

---

## 6. Experience-Specific Classifications

### `experiences.category`
- **Field Name**: `category`
- **Table**: `experiences`
- **Type**: TEXT (free-form)
- **Purpose**: Experience category (e.g., "Adventure", "Cultural", "Food & Drink")

### `experiences.difficulty_level`
- **Field Name**: `difficulty_level`
- **Table**: `experiences`
- **Values**: `'easy'`, `'moderate'`, `'challenging'`, `'expert'`
- **Purpose**: Difficulty classification

### `experiences.tags`
- **Field Name**: `tags`
- **Table**: `experiences`
- **Type**: TEXT[]
- **Purpose**: Tags for filtering (e.g., "family-friendly", "romantic", "adventurous")
- **Location**: `migrations/38_experience_system.sql`
- **Note**: This is the ONLY existing "tags" system in the codebase

---

## 7. Amenities System

### `omd_amenities`
- **Table**: `omd_amenities`
- **Fields**: 
  - `id` (UUID)
  - `omd_id` (UUID, FK to omds)
  - `name` (TEXT)
  - `category` (ENUM: `'general'`, `'room'`, `'facility'`)
  - `icon` (TEXT)
- **Purpose**: OMD-managed amenities list
- **Usage**: 
  - Hotels: `hotels.selected_amenities` (JSONB array of amenity IDs)
  - Rooms: `rooms.room_amenities` (JSONB array of amenity IDs)
- **Location**: `migrations/05_hotel_management_system.sql`

---

## 8. Summary of Naming Conventions

### Already Used Field Names:
- ✅ `type` - Business type (hotel/restaurant/experience)
- ✅ `category` - Experience category, menu categories
- ✅ `tags` - Experience tags (TEXT[])
- ✅ `label` - NOT USED (available)
- ✅ `classification` - NOT USED (available)
- ✅ `attribute` - NOT USED (available)
- ✅ `feature` - NOT USED (available)
- ✅ `property_subtype` - Hotel property type
- ✅ `room_type` - Room type
- ✅ `cuisine_type` - Restaurant cuisine
- ✅ `difficulty_level` - Experience difficulty
- ✅ `price_range` - Restaurant price range
- ✅ `dietary_tags` - Menu item dietary tags
- ✅ `selected_amenities` - Hotel amenities (JSONB)
- ✅ `room_amenities` - Room amenities (JSONB)
- ✅ `area_id` - Geographic area
- ✅ `status` - Business status
- ✅ `featured_order` - Featured ordering
- ✅ `is_omd_member` - OMD membership flag
- ✅ `is_featured_for_emails` - Email feature flag

---

## 9. Recommendations for New Label System

### Option 1: Use `label` (Recommended)
- **Field Name**: `label` or `labels` (if multiple)
- **Type**: TEXT or TEXT[]
- **Table**: `businesses`
- **Pros**: 
  - Clear, semantic name
  - Not currently used
  - Simple to implement
- **Cons**: None

### Option 2: Use `tags` (Like Experiences)
- **Field Name**: `tags`
- **Type**: TEXT[]
- **Table**: `businesses`
- **Pros**: 
  - Consistent with experiences
  - Supports multiple values
- **Cons**: 
  - Already used for experiences (but different table)
  - Might be confusing if experiences also have tags

### Option 3: Create Separate Table
- **Table**: `business_labels` or `business_tags`
- **Fields**: id, business_id, label_name, label_value, order_index
- **Pros**: 
  - Most flexible
  - Can add metadata per label
  - Supports many-to-many relationships
- **Cons**: 
  - More complex
  - Requires joins for queries

---

## 10. Current Filtering Mechanisms

### Existing Filters:
1. **By Type**: `businesses.type` (hotel/restaurant/experience)
2. **By Area**: `businesses.area_id` (geographic filtering)
3. **By Status**: `businesses.status` (active/inactive/pending)
4. **By Published**: `businesses.is_published` (visibility)
5. **By Featured**: `businesses.featured_order` (1-3)
6. **By OMD Member**: `businesses.is_omd_member` (membership badge)
7. **By Property Subtype**: `hotels.property_subtype` (hotel types)
8. **By Cuisine**: `restaurants.cuisine_type` (restaurant filtering)
9. **By Category**: `experiences.category` (experience filtering)
10. **By Tags**: `experiences.tags` (experience tags - TEXT[])
11. **By Difficulty**: `experiences.difficulty_level` (experience filtering)
12. **By Price Range**: `restaurants.price_range` (restaurant filtering)
13. **By Amenities**: `hotels.selected_amenities` (hotel amenities - JSONB)

---

## 11. Implementation Notes

### For Adding New Label System:

1. **If using `label` or `labels` field**:
   - Add to `businesses` table
   - Type: TEXT (single) or TEXT[] (multiple)
   - Add index for filtering: `CREATE INDEX idx_businesses_labels ON businesses USING GIN(labels);` (if TEXT[])
   - Update TypeScript types in `types/index.ts`

2. **If using separate table**:
   - Create `business_labels` table
   - Fields: id, business_id, label_name, created_at
   - Add foreign key to businesses
   - Add RLS policies
   - Add indexes

3. **Filtering Implementation**:
   - Add filter component similar to `AreaFilter`
   - Update `getBusinessesByOMD` query to support label filtering
   - Add to search params: `?label=value`

---

## 12. Conflict Prevention

### Names to AVOID:
- ❌ `type` - Already used for business type
- ❌ `category` - Already used for experiences and menu categories
- ❌ `tags` - Already used for experiences (but different table, so could work)
- ❌ `status` - Already used for business status
- ❌ `featured_order` - Already used for featured ordering
- ❌ `area_id` - Already used for geographic areas

### Names RECOMMENDED:
- ✅ `label` - Clean, semantic, not used
- ✅ `labels` - Plural version if using array
- ✅ `business_label` - More explicit
- ✅ `classification` - Not used, but more formal
- ✅ `attribute` - Not used, generic
- ✅ `feature` - Not used, but might be confused with amenities

---

**Last Updated**: 2024
**Status**: Current State Analysis


