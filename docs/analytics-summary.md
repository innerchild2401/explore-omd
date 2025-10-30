# Analytics Implementation Summary

## What We're Tracking

### Core Metrics
- **Page Views** - When someone views your business listing
- **Detail Views** - When someone opens full business details
- **Gallery Views** - When someone views photos
- **Contact Clicks** - When someone clicks call or email buttons
- **Bookings** - When someone completes a reservation/booking
- **Revenue** - Total money generated through the platform

### Business-Specific Tracking

**Hotels:**
- Room detail views
- Availability check clicks
- Booking initiations and completions

**Restaurants:**
- Menu views
- Menu item views
- Reservation/order clicks

**Experiences:**
- Time slot selections
- Booking initiations and completions

---

## Where Analytics Will Show

### OMD Admin Dashboard
The OMD admin will have a new **Analytics Tab** showing analytics across ALL businesses:
- Aggregated view of all businesses in the OMD
- Ability to filter by business category (hotels, restaurants, experiences)
- Individual business reports
- Category-level reports (e.g., all hotels, all restaurants)
- Top performing businesses
- Overall OMD performance metrics

### Business Owner Dashboard (Optional/Future)
Business owners may get limited analytics in the future, but the main analytics system is for OMD admins.

#### Summary Cards (Top Row)
- 📊 **Total Visitors** - Count of people who viewed all businesses
- 👁️ **Detail Views** - People who clicked to see more
- 📞 **Contact Clicks** - Calls/emails generated across all businesses
- 💰 **Bookings** - Reservations made across all businesses
- 💵 **Total Revenue** - Total money earned through the platform
- 📈 **Conversion Rate** - % of visitors who booked

#### Filtering Options
- **All Businesses** - Overall OMD performance
- **By Type** - Hotels only / Restaurants only / Experiences only
- **Individual Business** - Select specific business for detailed report
- **Date Range** - Custom timeframe for analysis

#### Charts & Visualizations
1. **Revenue Over Time** - Line chart showing earnings by day/week/month
2. **Visitor Traffic** - Bar chart of daily visitors
3. **Conversion Funnel** - Visual flow: Visitors → Details → Clicks → Bookings
4. **Event Distribution** - Pie chart of what visitors do most

#### Activity Feed
- Recent events timeline
- Last 50 activities with timestamps
- What visitors are doing right now

#### Data Tables
- Recent bookings with revenue details
- Top performing content/pages
- Revenue breakdown by period

---

## Implementation Overview

### Database Tables
1. **`business_analytics`** - Stores all tracking events (page views, clicks, etc.)
2. **`business_revenue`** - Dedicated revenue tracking with fees/commission

### Tracking Mechanism
- **Automatic** page view tracking when someone visits
- **Event-based** tracking for clicks and interactions
- **Revenue tracking** from completed bookings
- **Anonymous** tracking (no personal data collected)
- **Session-based** for non-logged-in users

### Privacy & Performance
- ✅ Hashed IP addresses for privacy
- ✅ No personal data in analytics
- ✅ GDPR compliant
- ✅ Fast queries with proper indexing
- ✅ Real-time updates on dashboard

---

## Key Features

### Date Filtering
Business owners can filter analytics by:
- Last 7 days
- Last 30 days  
- Last 90 days
- This year
- Custom date range

### Revenue Breakdown
- Gross revenue
- Platform fees (if applicable)
- Net revenue to business
- Grouped by month/year
- Payment status tracking

### Conversion Funnel
Visual representation of the customer journey:
```
1,000 Visitors → 300 Detail Views → 50 Contact Clicks → 10 Bookings
```
Shows drop-off at each stage and conversion rates.

### Real-Time Updates
- Live activity feed
- Charts update automatically
- Recent bookings appear instantly
- Current visitor count

---

## Files to Be Created

### Database
- `migrations/39_analytics_system.sql` - Schema and triggers

### Backend
- `lib/analytics/track.ts` - Tracking functions
- `app/api/analytics/track/route.ts` - Tracking API

### Frontend Components (Under components/admin/)
- `components/admin/AnalyticsDashboard.tsx` - Main analytics dashboard
- `components/admin/AnalyticsFilters.tsx` - Filter by business type/individual
- `components/admin/MetricsCard.tsx` - Summary cards
- `components/admin/RevenueChart.tsx` - Revenue visualization
- `components/admin/TrafficChart.tsx` - Traffic visualization
- `components/admin/ConversionFunnel.tsx` - Funnel chart
- `components/admin/ActivityTimeline.tsx` - Activity feed
- `components/admin/BusinessSelector.tsx` - Select individual business for report

### Hooks
- `hooks/useAnalytics.ts` - Analytics data fetching

---

## Files to Be Modified

### Dashboards
- `app/admin/(protected)/analytics/page.tsx` - NEW Analytics page for OMD admin
- `components/admin/AnalyticsDashboard.tsx` - Main analytics interface

### Public Pages (Add Tracking)
- `app/[omdSlug]/hotels/[hotelSlug]/page.tsx`
- `app/[omdSlug]/restaurants/[restaurantSlug]/page.tsx`
- `app/[omdSlug]/experiences/[experienceSlug]/page.tsx`

---

## Implementation Phases

1. **Phase 1**: Database setup (tables, indexes, RLS)
2. **Phase 2**: Tracking infrastructure (API, functions)
3. **Phase 3**: Integrate into public pages
4. **Phase 4**: Revenue tracking (triggers, calculations)
5. **Phase 5**: Build dashboard UI (charts, metrics)
6. **Phase 6**: Testing and optimization

---

## Success Metrics

✅ All page views tracked accurately  
✅ Revenue calculations are correct  
✅ Dashboard loads in <2 seconds  
✅ Real-time updates work  
✅ Privacy compliant (no personal data)  
✅ Business owners can filter by date range  
✅ Export to CSV/PDF works  
✅ Conversion funnel shows clear progression  

---

## Sample Analytics View

**OMD Admin Dashboard → Analytics Tab**

```
📊 Analytics Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Filter: [ All Businesses ▼ ] | [ Last 30 Days ▼ ]

[ Visitors ] [ Detail Views ] [ Clicks ] [ Bookings ] [ Revenue ] [ Conversion ]
    5,234        1,456         278        73         €45,450      1.4%

Showing: All Businesses in OMD | 15 Hotels, 8 Restaurants, 12 Experiences

💰 Revenue Chart (Last 30 Days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
€500  ▁▃▅▇█ ▃▅▇█ ▃▅▇█ ▃▅▇█
€400  ▁▂▃▅█ ▂▃▅█ ▂▃▅█ ▂▃▅█
€300  ▁▂▃▅█ ▁▂▃▅ ▁▂▃▅ ▁▂▃▅
€200  ▁▂▃▅ ▁▂▃▅ ▁▂▃▅ ▁▂▃▅
      Week 1   Week 2   Week 3   Week 4

📊 Conversion Funnel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5,234 Visitors
   ↓ 28%
1,456 Detail Views
   ↓ 19%
  278 Contact Clicks
   ↓ 26%
   73 Bookings

🏆 Top Performing Businesses
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Hotel Grand Marina     - 1,234 views | €12,450 revenue
2. Restaurant Porto        - 856 views  | €8,900 revenue
3. City Walking Tour       - 623 views  | €5,200 revenue
```

