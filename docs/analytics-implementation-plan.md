# Analytics Implementation Plan

## Overview
Implement comprehensive analytics tracking across the platform to provide business owners with insights into:
- Visitor traffic (page views)
- User engagement (detail views)
- Lead generation (call/email clicks)
- Conversions (bookings)
- Revenue tracking
- Time-period analysis

---

## 1. Database Schema

### New Tables to Create

#### `business_analytics` - Core Analytics Table
```sql
CREATE TABLE business_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Event Type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view',           -- Someone viewed the business page
    'detail_view',         -- Someone viewed details
    'gallery_view',        -- Someone viewed image gallery
    'contact_click',       -- Someone clicked call/email button
    'menu_view',           -- Restaurant: viewed menu
    'room_view',           -- Hotel: viewed room details
    'experience_view',     -- Experience: viewed time slots
    'booking_initiated',   -- Started booking process
    'booking_completed',   -- Completed booking
    'booking_cancelled'    -- Cancelled booking
  )),
  
  -- User Information
  session_id TEXT,              -- For anonymous users
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  
  -- Event Context
  referrer TEXT,                -- Where they came from
  page_url TEXT,                -- Current page
  metadata JSONB DEFAULT '{}',  -- Additional event-specific data
  
  -- Revenue (for bookings)
  revenue_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `business_revenue` - Dedicated Revenue Tracking
```sql
CREATE TABLE business_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN ('reservation', 'booking', 'order')),
  source_id UUID NOT NULL,  -- References reservation_id, booking_id, etc.
  
  -- Revenue Details
  gross_amount DECIMAL(10,2) NOT NULL,
  fees DECIMAL(10,2) DEFAULT 0,     -- Platform fees
  net_amount DECIMAL(10,2) NOT NULL, -- Amount to business
  currency TEXT DEFAULT 'EUR',
  
  -- Period
  check_in_date DATE,           -- For hotels
  check_out_date DATE,          -- For hotels
  booking_date DATE,            -- For experiences/restaurants
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- Status
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. Analytics Events to Track

### Public Pages (Hotel/Restaurant/Experience)

#### Page Level Events:
1. **Page View** - When someone lands on the business listing page
2. **Detail View** - When they click to see full details
3. **Gallery View** - When they view images
4. **Contact Click** - When they click call/email buttons

#### Specific Events by Type:

**Hotels:**
- Room detail view
- Check availability click
- Booking initiated (date selected)
- Booking completed

**Restaurants:**
- Menu view
- Menu item view
- Reservation click
- Order click (if applicable)

**Experiences:**
- Time slot selection
- Booking initiated
- Booking completed

---

## 3. Revenue Tracking Integration

### Hotels
From `hotel_reservations` table:
- Track total_price as revenue
- Calculate commission/fees (if applicable)
- Group by month/year

### Restaurants
From `restaurant_orders` table (if exists):
- Track order total as revenue
- Track tips separately

### Experiences
From `experience_bookings` table:
- Track total_price as revenue

---

## 4. Analytics Dashboard UI

### Components Needed:

#### 1. AnalyticsSummary Component
Displays key metrics:
- Total visitors (page views)
- Unique visitors
- Detail page views
- Contact clicks
- Bookings
- Revenue
- Conversion rate

#### 2. RevenueChart Component
- Line/bar chart showing revenue over time
- Filters: Last 7 days, 30 days, 90 days, This year
- Breakdown by month/week

#### 3. TrafficChart Component
- Visitor traffic over time
- Page views vs unique visitors

#### 4. ConversionFunnel Component
- Visual funnel: Visitors → Detail Views → Contact Clicks → Bookings
- Conversion rates at each stage

#### 5. ActivityTimeline Component
- Recent events feed
- Last 50 events with timestamps

---

## 5. Implementation Steps

### Phase 1: Database Setup
1. Create migration file for analytics tables
2. Add indexes for performance
3. Set up RLS policies
4. Create triggers for automatic revenue tracking

### Phase 2: Tracking Functions
1. Create server-side tracking API route
2. Create client-side tracking hooks
3. Implement automatic page view tracking
4. Implement click event tracking

### Phase 3: Public Page Integration
1. Add tracking to hotel detail pages
2. Add tracking to restaurant detail pages
3. Add tracking to experience detail pages
4. Add tracking to listing pages

### Phase 4: Revenue Tracking
1. Create trigger to auto-populate business_revenue
2. Track hotel reservations
3. Track restaurant orders
4. Track experience bookings

### Phase 5: Dashboard UI
1. Create analytics tab in business dashboards
2. Build summary cards
3. Create chart components
4. Add filters and date range selection

### Phase 6: Testing & Refinement
1. Test analytics accuracy
2. Optimize queries for performance
3. Add export functionality (CSV/PDF)

---

## 6. Technical Considerations

### Privacy & GDPR Compliance
- Hash IP addresses
- No personal data in analytics
- Session-based tracking for anonymous users
- Opt-out capability

### Performance
- Index on (business_id, created_at, event_type)
- Consider materialized views for aggregations
- Cache dashboard data
- Pagination for event history

### Real-time Updates
- Use Supabase real-time subscriptions for live updates
- Show recent activity in real-time
- Update charts on new events

---

## 7. Metrics to Display

### Overview Cards (Top of Dashboard)
1. **Total Visitors** - Count of page_view events
2. **Detail Views** - Count of detail_view events  
3. **Contact Clicks** - Count of contact_click events
4. **Bookings** - Count of booking_completed events
5. **Total Revenue** - Sum of revenue_amount
6. **Conversion Rate** - (Bookings / Visitors) × 100

### Charts
1. **Revenue Over Time** - Line chart
2. **Visitor Traffic** - Bar chart (daily/weekly)
3. **Conversion Funnel** - Funnel visualization
4. **Event Types Distribution** - Pie chart

### Tables
1. **Recent Bookings** - Last 10 bookings with revenue
2. **Top Performing Pages** - Most viewed content
3. **Event Timeline** - Recent activity log

---

## 8. Implementation Files

### New Files to Create:
```
migrations/39_analytics_system.sql          - Database schema
lib/analytics/track.ts                      - Tracking functions
app/api/analytics/track/route.ts            - API endpoint
components/analytics/AnalyticsDashboard.tsx - Main dashboard
components/analytics/MetricsCard.tsx        - Metric cards
components/analytics/RevenueChart.tsx       - Revenue chart
components/analytics/TrafficChart.tsx       - Traffic chart
components/analytics/ConversionFunnel.tsx   - Conversion funnel
components/analytics/ActivityTimeline.tsx   - Activity feed
hooks/useAnalytics.ts                       - Analytics hook
```

### Files to Modify:
```
components/business/HotelDashboard.tsx      - Add Analytics tab
components/business/RestaurantDashboard.tsx - Add Analytics tab
components/business/ExperienceDashboard.tsx - Add Analytics tab
app/[omdSlug]/hotels/[hotelSlug]/page.tsx   - Add tracking calls
app/[omdSlug]/restaurants/[restaurantSlug]/page.tsx - Add tracking calls
app/[omdSlug]/experiences/[experienceSlug]/page.tsx - Add tracking calls
```

---

## 9. Sample Queries

### Get Visitor Count for Last 30 Days
```sql
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as views,
  COUNT(DISTINCT session_id) as unique_visitors
FROM business_analytics
WHERE business_id = $1
  AND event_type = 'page_view'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

### Get Conversion Funnel
```sql
WITH events AS (
  SELECT 
    event_type,
    COUNT(*) as count,
    COUNT(DISTINCT session_id) as unique_count
  FROM business_analytics
  WHERE business_id = $1
    AND created_at >= $2  -- Start date
    AND created_at <= $3  -- End date
  GROUP BY event_type
)
SELECT * FROM events WHERE event_type IN (
  'page_view', 'detail_view', 'contact_click', 'booking_completed'
)
ORDER BY 
  CASE event_type
    WHEN 'page_view' THEN 1
    WHEN 'detail_view' THEN 2
    WHEN 'contact_click' THEN 3
    WHEN 'booking_completed' THEN 4
  END;
```

### Get Revenue by Month
```sql
SELECT 
  year,
  month,
  SUM(gross_amount) as total_revenue,
  SUM(net_amount) as net_revenue,
  COUNT(*) as transaction_count
FROM business_revenue
WHERE business_id = $1
  AND payment_status = 'paid'
GROUP BY year, month
ORDER BY year DESC, month DESC;
```

---

## 10. Success Criteria

✅ Analytics data is accurately tracked
✅ Dashboard loads quickly (<2 seconds)
✅ Revenue calculations are correct
✅ Privacy-compliant tracking
✅ Charts update in real-time
✅ Export functionality works
✅ Business owners can filter by date range
✅ Conversion funnel shows clear progression

---

## Next Steps
1. Create database migration
2. Build tracking infrastructure
3. Integrate into public pages
4. Build dashboard UI
5. Test and refine

