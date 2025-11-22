# Auto-Generated Pages - Complete List

## Overview
These pages are automatically generated for ALL OMDs without any manual input from OMD managers. They are managed only by superadmin and update automatically based on real business data.

---

## Available Data Sources

### Hotels
- **Reservations**: `reservations` table (check_in_date, total_amount, reservation_status, created_at)
- **Prices**: `rooms.base_price` (lowest price per hotel)
- **Ratings**: `businesses.rating` (0.0 - 5.0)
- **Property Types**: `hotels.property_subtype` (hotel, bnb, guesthouse, hostel, resort, apartment)
- **Star Ratings**: `hotels.star_rating` (1-5)
- **Created Date**: `businesses.created_at`

### Restaurants
- **Reservations**: `restaurant_reservations` table (reservation_date, created_at)
- **Price Range**: `restaurants.price_range` ($, $$, $$$, $$$$)
- **Cuisine Type**: `restaurants.cuisine_type` (free text)
- **Ratings**: `businesses.rating` (0.0 - 5.0)
- **Created Date**: `businesses.created_at`

### Experiences
- **Bookings**: `experience_bookings` table (booking_date, total_price, created_at, status)
- **Prices**: `experiences.price_from` (starting price)
- **Category**: `experiences.category` (free text)
- **Difficulty**: `experiences.difficulty_level` (easy, moderate, challenging, expert)
- **Ratings**: `businesses.rating` (0.0 - 5.0)
- **Created Date**: `businesses.created_at`

---

## Auto-Generated Pages List

### 1. HOTELS - Most Booked

#### 1.1 Top 5 Cele Mai Rezervate Hoteluri (All Time)
- **URL**: `/{omdSlug}/top/most-booked-hotels/all-time`
- **Title**: "Top 5 Cele Mai Rezervate Hoteluri în {Destination}"
- **Data Source**: Count of `reservations` where `reservation_status IN ('confirmed', 'checked_in', 'checked_out')`
- **Time Period**: All time
- **Sort**: DESC by reservation count
- **Regeneration**: Weekly

#### 1.2 Top 5 Cele Mai Rezervate Hoteluri (Ultima Săptămână)
- **URL**: `/{omdSlug}/top/most-booked-hotels/last-7-days`
- **Title**: "Top 5 Cele Mai Rezervate Hoteluri în Ultima Săptămână - {Destination}"
- **Data Source**: Count of `reservations` where `created_at >= NOW() - INTERVAL '7 days'`
- **Time Period**: Last 7 days
- **Sort**: DESC by reservation count
- **Regeneration**: Daily

#### 1.3 Top 5 Cele Mai Rezervate Hoteluri (Luna Aceasta)
- **URL**: `/{omdSlug}/top/most-booked-hotels/this-month`
- **Title**: "Top 5 Cele Mai Rezervate Hoteluri în Luna Aceasta - {Destination}"
- **Data Source**: Count of `reservations` where `created_at >= DATE_TRUNC('month', NOW())`
- **Time Period**: Current month
- **Sort**: DESC by reservation count
- **Regeneration**: Daily

---

### 2. HOTELS - Cheapest

#### 2.1 Top 5 Cele Mai Ieftine Hoteluri
- **URL**: `/{omdSlug}/top/cheapest-hotels`
- **Title**: "Top 5 Cele Mai Ieftine Hoteluri în {Destination}"
- **Data Source**: `MIN(rooms.base_price)` per hotel
- **Time Period**: Current (live prices)
- **Sort**: ASC by lowest price
- **Regeneration**: Daily (prices can change)

---

### 3. HOTELS - Highest Rated

#### 3.1 Top 5 Cele Mai Bine Evaluate Hoteluri
- **URL**: `/{omdSlug}/top/highest-rated-hotels`
- **Title**: "Top 5 Cele Mai Bine Evaluate Hoteluri în {Destination}"
- **Data Source**: `businesses.rating` (must have rating > 0)
- **Time Period**: All time
- **Sort**: DESC by rating
- **Regeneration**: Weekly

---

### 4. HOTELS - By Property Type

#### 4.1 Top 5 Resorturi
- **URL**: `/{omdSlug}/top/resorts`
- **Title**: "Top 5 Resorturi în {Destination}"
- **Data Source**: Hotels where `property_subtype = 'resort'`
- **Sort**: DESC by rating, then by reservation count
- **Regeneration**: Weekly

#### 4.2 Top 5 B&B-uri
- **URL**: `/{omdSlug}/top/bnb`
- **Title**: "Top 5 B&B-uri în {Destination}"
- **Data Source**: Hotels where `property_subtype = 'bnb'`
- **Sort**: DESC by rating, then by reservation count
- **Regeneration**: Weekly

#### 4.3 Top 5 Apartamente
- **URL**: `/{omdSlug}/top/apartments`
- **Title**: "Top 5 Apartamente în {Destination}"
- **Data Source**: Hotels where `property_subtype = 'apartment'`
- **Sort**: DESC by rating, then by reservation count
- **Regeneration**: Weekly

---

### 5. HOTELS - By Star Rating

#### 5.1 Top 5 Hoteluri 5 Stele
- **URL**: `/{omdSlug}/top/5-star-hotels`
- **Title**: "Top 5 Hoteluri 5 Stele în {Destination}"
- **Data Source**: Hotels where `star_rating = 5`
- **Sort**: DESC by rating, then by reservation count
- **Regeneration**: Weekly

#### 5.2 Top 5 Hoteluri 4 Stele
- **URL**: `/{omdSlug}/top/4-star-hotels`
- **Title**: "Top 5 Hoteluri 4 Stele în {Destination}"
- **Data Source**: Hotels where `star_rating = 4`
- **Sort**: DESC by rating, then by reservation count
- **Regeneration**: Weekly

---

### 6. RESTAURANTS - Most Visited

#### 6.1 Top 5 Cele Mai Vizitate Restaurante (All Time)
- **URL**: `/{omdSlug}/top/most-visited-restaurants/all-time`
- **Title**: "Top 5 Cele Mai Vizitate Restaurante în {Destination}"
- **Data Source**: Count of `restaurant_reservations` where `status IN ('confirmed', 'completed')`
- **Time Period**: All time
- **Sort**: DESC by reservation count
- **Regeneration**: Weekly

#### 6.2 Top 5 Cele Mai Vizitate Restaurante (Ultima Săptămână)
- **URL**: `/{omdSlug}/top/most-visited-restaurants/last-7-days`
- **Title**: "Top 5 Cele Mai Vizitate Restaurante în Ultima Săptămână - {Destination}"
- **Data Source**: Count of `restaurant_reservations` where `created_at >= NOW() - INTERVAL '7 days'`
- **Time Period**: Last 7 days
- **Sort**: DESC by reservation count
- **Regeneration**: Daily

#### 6.3 Top 5 Cele Mai Vizitate Restaurante (Luna Aceasta)
- **URL**: `/{omdSlug}/top/most-visited-restaurants/this-month`
- **Title**: "Top 5 Cele Mai Vizitate Restaurante în Luna Aceasta - {Destination}"
- **Data Source**: Count of `restaurant_reservations` where `created_at >= DATE_TRUNC('month', NOW())`
- **Time Period**: Current month
- **Sort**: DESC by reservation count
- **Regeneration**: Daily

---

### 7. RESTAURANTS - By Price Range

#### 7.1 Top 5 Restaurante Buget ($)
- **URL**: `/{omdSlug}/top/budget-restaurants`
- **Title**: "Top 5 Restaurante Buget în {Destination}"
- **Data Source**: Restaurants where `price_range = '$'`
- **Sort**: DESC by rating, then by reservation count
- **Regeneration**: Weekly

#### 7.2 Top 5 Restaurante Mid-Range ($$)
- **URL**: `/{omdSlug}/top/mid-range-restaurants`
- **Title**: "Top 5 Restaurante Mid-Range în {Destination}"
- **Data Source**: Restaurants where `price_range = '$$'`
- **Sort**: DESC by rating, then by reservation count
- **Regeneration**: Weekly

#### 7.3 Top 5 Restaurante Fine Dining ($$$)
- **URL**: `/{omdSlug}/top/fine-dining-restaurants`
- **Title**: "Top 5 Restaurante Fine Dining în {Destination}"
- **Data Source**: Restaurants where `price_range IN ('$$$', '$$$$')`
- **Sort**: DESC by rating, then by reservation count
- **Regeneration**: Weekly

---

### 8. RESTAURANTS - Highest Rated

#### 8.1 Top 5 Cele Mai Bine Evaluate Restaurante
- **URL**: `/{omdSlug}/top/highest-rated-restaurants`
- **Title**: "Top 5 Cele Mai Bine Evaluate Restaurante în {Destination}"
- **Data Source**: `businesses.rating` (must have rating > 0)
- **Time Period**: All time
- **Sort**: DESC by rating
- **Regeneration**: Weekly

---

### 9. EXPERIENCES - Most Booked

#### 9.1 Top 5 Cele Mai Rezervate Experiențe (All Time)
- **URL**: `/{omdSlug}/top/most-booked-experiences/all-time`
- **Title**: "Top 5 Cele Mai Rezervate Experiențe în {Destination}"
- **Data Source**: Count of `experience_bookings` where `status IN ('confirmed', 'completed')`
- **Time Period**: All time
- **Sort**: DESC by booking count
- **Regeneration**: Weekly

#### 9.2 Top 5 Cele Mai Rezervate Experiențe (Ultima Săptămână)
- **URL**: `/{omdSlug}/top/most-booked-experiences/last-7-days`
- **Title**: "Top 5 Cele Mai Rezervate Experiențe în Ultima Săptămână - {Destination}"
- **Data Source**: Count of `experience_bookings` where `created_at >= NOW() - INTERVAL '7 days'`
- **Time Period**: Last 7 days
- **Sort**: DESC by booking count
- **Regeneration**: Daily

#### 9.3 Top 5 Cele Mai Rezervate Experiențe (Luna Aceasta)
- **URL**: `/{omdSlug}/top/most-booked-experiences/this-month`
- **Title**: "Top 5 Cele Mai Rezervate Experiențe în Luna Aceasta - {Destination}"
- **Data Source**: Count of `experience_bookings` where `created_at >= DATE_TRUNC('month', NOW())`
- **Time Period**: Current month
- **Sort**: DESC by booking count
- **Regeneration**: Daily

---

### 10. EXPERIENCES - Cheapest

#### 10.1 Top 5 Cele Mai Ieftine Experiențe
- **URL**: `/{omdSlug}/top/cheapest-experiences`
- **Title**: "Top 5 Cele Mai Ieftine Experiențe în {Destination}"
- **Data Source**: `experiences.price_from` (must have price)
- **Time Period**: Current (live prices)
- **Sort**: ASC by price_from
- **Regeneration**: Daily

---

### 11. EXPERIENCES - Highest Rated

#### 11.1 Top 5 Cele Mai Bine Evaluate Experiențe
- **URL**: `/{omdSlug}/top/highest-rated-experiences`
- **Title**: "Top 5 Cele Mai Bine Evaluate Experiențe în {Destination}"
- **Data Source**: `businesses.rating` (must have rating > 0)
- **Time Period**: All time
- **Sort**: DESC by rating
- **Regeneration**: Weekly

---

### 12. EXPERIENCES - By Difficulty

#### 12.1 Top 5 Experiențe Ușoare
- **URL**: `/{omdSlug}/top/easy-experiences`
- **Title**: "Top 5 Experiențe Ușoare în {Destination}"
- **Data Source**: Experiences where `difficulty_level = 'easy'`
- **Sort**: DESC by rating, then by booking count
- **Regeneration**: Weekly

#### 12.2 Top 5 Experiențe Moderate
- **URL**: `/{omdSlug}/top/moderate-experiences`
- **Title**: "Top 5 Experiențe Moderate în {Destination}"
- **Data Source**: Experiences where `difficulty_level = 'moderate'`
- **Sort**: DESC by rating, then by booking count
- **Regeneration**: Weekly

#### 12.3 Top 5 Experiențe Provocatoare
- **URL**: `/{omdSlug}/top/challenging-experiences`
- **Title**: "Top 5 Experiențe Provocatoare în {Destination}"
- **Data Source**: Experiences where `difficulty_level IN ('challenging', 'expert')`
- **Sort**: DESC by rating, then by booking count
- **Regeneration**: Weekly

---

### 13. ALL BUSINESSES - Newest

#### 13.1 Top 5 Cele Mai Noi Locații
- **URL**: `/{omdSlug}/top/newest-businesses`
- **Title**: "Top 5 Cele Mai Noi Locații în {Destination}"
- **Data Source**: `businesses.created_at` (most recent)
- **Time Period**: Last 30 days
- **Sort**: DESC by created_at
- **Regeneration**: Daily

---

## Summary Statistics

### Total Pages per OMD: **32 pages**

**Breakdown:**
- Hotels: 12 pages
- Restaurants: 8 pages
- Experiences: 9 pages
- All Businesses: 1 page
- Mixed/Other: 2 pages (if we add combined pages)

### Regeneration Frequency:
- **Daily**: 10 pages (recent activity, prices)
- **Weekly**: 22 pages (all-time stats, ratings, property types)

---

## Page Configuration Schema

Each auto-generated page needs:
```typescript
{
  page_type: 'most-booked-hotels' | 'cheapest-hotels' | 'highest-rated-hotels' | ...
  business_type: 'hotel' | 'restaurant' | 'experience' | 'all'
  time_period: 'all-time' | 'last-7-days' | 'this-month' | null
  filter_criteria: {
    property_subtype?: string
    star_rating?: number
    price_range?: string
    difficulty_level?: string
    cuisine_type?: string
  }
  count: 5
  title_template: string
  meta_description_template: string
  header_template: string
  url_slug: string
}
```

---

## Content Generation Strategy

### Template-Based Only (No AI)
**All content is template-based with dynamic data insertion:**

1. **Title**: Template with placeholders
   - Template: `"Top {count} Cele Mai Rezervate Hoteluri în {destination}"`
   - Database fills: `{count}` = 5, `{destination}` = "Constanta"
   - Result: `"Top 5 Cele Mai Rezervate Hoteluri în Constanta"`
   - **Managed by superadmin** - can edit templates

2. **Meta Description**: Template with dynamic business names
   - Template: `"Descoperă cele mai rezervate hoteluri din {destination}. {business1}, {business2}, {business3} și altele."`
   - Database fills: Business names from top 3 results
   - **Managed by superadmin** - can edit templates

3. **Header (H1)**: Same as title
   - Uses same template as title
   - **Managed by superadmin**

4. **Intro Paragraph**: Template (optional)
   - Template: `"Aceste {business_type} au fost cele mai {metric} în {destination}, oferind experiențe de neuitat."`
   - Database fills: business_type, metric, destination
   - **Managed by superadmin** - can edit or disable
   - **No AI generation** - pure template

5. **Business List**: Pure database data
   - Business names, images, ratings, prices from database
   - **No templates needed** - direct database output

### Template Management
- **Superadmin manages all templates** via admin dashboard
- Templates stored in `auto_top_pages` table
- Can edit title, meta description, header, intro templates per page type
- Templates support placeholders: `{count}`, `{destination}`, `{business_type}`, `{metric}`, `{business1}`, `{business2}`, `{business3}`
- Changes apply to all OMDs (global templates)
- **No AI generation** - 100% template-based

## Implementation Notes

1. **Minimum Data Requirements**:
   - Pages only generate if at least 3 businesses match criteria
   - If less than 5 businesses, show available ones
   - Show message if no data available

2. **Fallback Sorting**:
   - Primary sort: By metric (bookings, price, rating)
   - Secondary sort: By rating (if available)
   - Tertiary sort: By name (alphabetical)

3. **SEO Considerations**:
   - Each page has unique URL
   - Dynamic meta descriptions based on actual businesses (template + data)
   - Include "Last updated" timestamp
   - Structured data (ItemList schema)

4. **Performance**:
   - Cache results in `auto_top_page_content` table
   - Templates stored in `auto_top_pages` table
   - Regenerate business list on schedule, not on-demand
   - Show cached data immediately, update in background

5. **Superadmin Management**:
   - Enable/disable individual page types
   - Adjust count (default 5, can be 3, 5, 10)
   - **Edit templates** (title, meta description, header, intro) - applies globally to all OMDs
   - View regeneration logs
   - Preview template output with sample data

---

**Status**: Complete List
**Last Updated**: 2024

