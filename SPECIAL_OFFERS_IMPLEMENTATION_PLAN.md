# 🎯 Special Offers Integration Plan

## Overview
This document outlines the strategy for integrating special offers/promotions into the explore-omd platform. The system will allow businesses to create, manage, and display special offers to customers, enhancing the booking experience and driving revenue.

---

## 1. Visual Design & Display

### A. Badge System
- **"Special Offer" Badge**: Small, eye-catching badge in top-right corner of cards (similar to OMD Member badge)
  - Color: Orange/red gradient (distinct from blue OMD badge)
  - Icon: Sparkle or tag icon
  - Text: "Special Offer" or "% OFF"
  
- **Price Display**:
  - Large, bold discounted price
  - Smaller, strikethrough original price
  - Savings amount: "Save 150 RON" in green
  - Countdown timer for time-sensitive offers: "Ends in 3 days"

### B. Where to Display

#### 1. Explore Page Carousels
- Highlighted cards with subtle border glow or shadow
- "Special Offer" badge on image
- Show discount percentage on card

#### 2. Hotel Detail Page
- **Hero Banner**: Below main image - "🎉 Special Offer: 20% off all rooms this month"
- **Room Cards**: Enhanced styling for rooms with offers
- **Dedicated Section**: "Special Offers" section above rooms list

#### 3. Room Cards
- Badge overlay on image
- Price comparison (original vs. discounted)
- "Limited time" indicator if applicable
- Offer description: "Book 3+ nights, get 15% off"

#### 4. Search Results
- Sort by "Best Deals"
- Filter: "Show only special offers"
- Visual indicator in list view

---

## 2. Business Dashboard Management

### A. New Tab: "Special Offers"
Add a new tab in HotelDashboard between "Rooms" and "Availability":

```
Tabs: Info | Rooms | Special Offers | Availability | Bookings | Reservations | Analytics
```

### B. Offer Management Interface

#### 1. Overview Dashboard
- Active offers count
- Total bookings from offers
- Revenue impact
- Quick stats: "3 active offers, 12 bookings, +2,400 RON revenue"

#### 2. Offer Creation Form
- **Offer Type**:
  - Percentage discount (e.g., 20% off)
  - Fixed amount (e.g., 100 RON off)
  - Buy X, get Y (e.g., Book 3 nights, get 1 free)
  - Early bird (e.g., 15% off if booked 30+ days ahead)
  
- **Scope**:
  - All rooms
  - Specific room types
  - Specific individual rooms
  
- **Date Range**:
  - Booking dates (when customer books)
  - Stay dates (when customer stays)
  - Both
  
- **Conditions**:
  - Minimum nights
  - Maximum nights
  - Day of week restrictions
  - Guest count requirements
  
- **Visibility**:
  - Public (shown to all)
  - Private (promo code only)
  - Member-only (OMD members)
  
- **Display Settings**:
  - Badge text
  - Description
  - Hero banner text
  - Featured image (optional)

#### 3. Offer List View
- Table with:
  - Offer name/description
  - Type (percentage/fixed/etc.)
  - Status (Active/Upcoming/Expired)
  - Date range
  - Bookings count
  - Revenue impact
  - Actions (Edit/Deactivate/Duplicate/Delete)
  
- Quick actions:
  - Activate/Deactivate toggle
  - Extend dates
  - View analytics

#### 4. Calendar Integration
- Visual calendar showing:
  - Active offer periods
  - Overlapping offers
  - Booking density
- Drag-and-drop to adjust dates
- Color coding by offer type

---

## 3. Customer Journey

### Phase 1: Discovery
1. **Landing on Explore Page**
   - Special offers highlighted in carousels
   - "Special Offers" filter/section
   - Visual cues draw attention

2. **Hotel Detail Page**
   - Hero banner with main offer
   - "Special Offers" section with all active offers
   - Clear value proposition

### Phase 2: Consideration
1. **Room Selection**
   - Rooms with offers clearly marked
   - Price comparison visible
   - Offer details on hover/click
   - Urgency indicators (time remaining, limited availability)

2. **Offer Details Modal**
   - Full offer description
   - Terms and conditions
   - Eligibility checker
   - "How to claim" instructions

### Phase 3: Booking
1. **Booking Modal**
   - Offer automatically applied
   - Price breakdown showing:
     - Original price
     - Discount amount
     - Final price
   - Offer confirmation message

2. **Confirmation**
   - Email includes offer details
   - Reminder of offer terms
   - Upsell: "You saved 200 RON! Book another stay?"

---

## 4. Technical Considerations

### Database Structure
- `special_offers` table:
  - Business/room relationships
  - Offer type, value, conditions
  - Date ranges
  - Status, visibility
  - Analytics fields

### Pricing Logic
- Integrate with existing `PricingCalendar`
- Priority system: special offers override base pricing
- Conflict resolution: if multiple offers apply, use best value
- Real-time calculation in booking flow

### Analytics
- Track:
  - Offer views
  - Click-through rates
  - Conversion rates
  - Revenue impact
  - Most effective offer types

---

## 5. Advanced Features (Future)

### 1. Automated Offers
- Low-occupancy triggers
- Seasonal suggestions
- Competitor price matching

### 2. Personalization
- User-specific offers
- Loyalty rewards
- Returning customer discounts

### 3. A/B Testing
- Test offer messaging
- Test discount amounts
- Optimize conversion

### 4. Promo Codes
- Generate unique codes
- Track usage
- Limit redemptions

---

## 6. Design Principles

- **Visibility**: Make offers easy to spot without being intrusive
- **Trust**: Clear terms, no hidden conditions
- **Urgency**: Use time limits and availability indicators
- **Value**: Emphasize savings clearly
- **Consistency**: Match existing design language (rounded cards, blue accents, clean typography)

---

## 7. Mobile Considerations

- Touch-friendly offer badges
- Swipeable offer carousel
- Sticky offer banner on scroll
- Simplified offer details for small screens

---

## 8. Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Database schema for `special_offers` table
- [ ] Basic offer creation form in business dashboard
- [ ] Offer display on room cards
- [ ] Price calculation integration
- [ ] Basic offer badge system

### Phase 2: Enhanced Display
- [ ] Hero banner on hotel detail pages
- [ ] Special offers section on explore page
- [ ] Offer details modal
- [ ] Filter/sort by offers
- [ ] Countdown timers

### Phase 3: Advanced Management
- [ ] Calendar view for offers
- [ ] Analytics dashboard
- [ ] Offer templates
- [ ] Bulk operations
- [ ] Offer duplication

### Phase 4: Advanced Features
- [ ] Promo codes
- [ ] Automated offers
- [ ] Personalization
- [ ] A/B testing
- [ ] Email integration

---

## 9. Files to Create/Modify

### New Components
- `components/business/SpecialOffersTab.tsx` - Main offers management tab
- `components/business/OfferForm.tsx` - Offer creation/editing form
- `components/business/OffersList.tsx` - Offers list view
- `components/business/OffersCalendar.tsx` - Calendar view
- `components/ui/SpecialOfferBadge.tsx` - Reusable badge component
- `components/hotels/OfferBanner.tsx` - Hero banner for offers
- `components/hotels/OfferDetailsModal.tsx` - Offer details modal
- `components/hotels/OfferPriceDisplay.tsx` - Price with offer display

### Modified Components
- `components/business/HotelDashboard.tsx` - Add "Special Offers" tab
- `components/hotels/RoomCard.tsx` - Add offer badge and pricing
- `components/sections/BusinessCarousel.tsx` - Highlight offers
- `app/[omdSlug]/hotels/[hotelSlug]/page.tsx` - Add offer banner
- `app/[omdSlug]/explore/page.tsx` - Add offers filter
- `components/hotels/BookingModal.tsx` - Show applied offer

### Database Migrations
- Create `special_offers` table
- Add offer relationships to rooms/businesses
- Add offer tracking fields

### API Routes
- `app/api/offers/route.ts` - CRUD operations
- `app/api/offers/calculate/route.ts` - Price calculation
- `app/api/offers/analytics/route.ts` - Analytics data

---

## 10. Success Metrics

- **Adoption**: % of businesses using offers
- **Engagement**: Offer click-through rates
- **Conversion**: Booking rate for offers vs. regular pricing
- **Revenue**: Additional revenue from offers
- **Customer Satisfaction**: Feedback on offer visibility and clarity

---

## Notes

- This plan integrates seamlessly with existing pricing system (`PricingCalendar`)
- Maintains consistency with current design patterns
- Provides clear value to both businesses and customers
- Designed to scale with future enhancements

**Created**: 2024
**Status**: Planning Phase
**Priority**: Medium-High

