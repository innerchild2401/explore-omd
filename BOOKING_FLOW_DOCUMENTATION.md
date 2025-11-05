# Booking Flow - Complete Process Documentation

This document walks through the complete booking process for both scenarios: hotels using our internal PMS and hotels using Octorate channel manager.

---

## 📋 Booking Flow Overview

### Two Scenarios:

1. **Hotel uses our Internal PMS** (`pms_type = 'internal'`)
   - No channel manager connected
   - Hotel manages everything in our platform

2. **Hotel uses Octorate Channel Manager** (`pms_type = 'octorate'`)
   - Hotel connected to Octorate
   - Inventory, availability, rates synced FROM Octorate (read-only)
   - Bookings pushed TO Octorate

---

## 🔄 Complete Booking Flow

### Scenario 1: Hotel Uses Our Internal PMS (No Channel Manager)

#### Step 1: Guest Makes Reservation
**Location**: Guest books on our platform (public website)
- **Component**: `components/hotels/BookingForm.tsx` or `components/hotels/BookingModal.tsx`
- **Process**:
  1. Guest fills out booking form (dates, guest info, room selection)
  2. System creates/updates guest profile
  3. System gets or creates booking channel ("website")
  4. **Reservation created with status: `'tentative'`**
  5. Email notification sent (fire-and-forget)

**Reservation Details**:
- `reservation_status`: `'tentative'`
- `payment_status`: `'pending'`
- `base_rate`: `0` (will be calculated when approved)
- `total_amount`: `0` (will be calculated when approved)
- `octorate_push_status`: `'skipped'` (not applicable)

#### Step 2: Admin Reviews Tentative Booking
**Location**: Hotel Dashboard → Booking Management
- **Component**: `components/business/PendingReservations.tsx`
- **Process**:
  1. Admin sees notification badge (toast notification)
  2. Admin opens "Pending Reservations" tab
  3. Admin reviews booking details:
     - Guest information
     - Dates and room type
     - Number of nights
     - Special requests

#### Step 3: Admin Approves Booking
**Location**: `components/business/PendingReservations.tsx` → "✓ Approve" button
- **Process**:
  1. Admin clicks "Approve"
  2. System calculates pricing:
     - Base rate = nightly rate × number of nights
     - Taxes = base rate × 10%
     - Total amount = base rate + taxes + fees
  3. **Reservation updated**:
     - `reservation_status`: `'confirmed'`
     - `base_rate`: Calculated
     - `taxes`: Calculated
     - `total_amount`: Calculated
     - `confirmation_sent`: `true`
  4. Confirmation email sent to guest
  5. Booking appears in "Confirmed Reservations"

#### Step 4: Booking is Active
- Booking appears in Availability Dashboard
- Room availability is updated
- Booking can be checked in/out
- Booking is tracked in analytics

---

### Scenario 2: Hotel Uses Octorate Channel Manager

#### Step 1: Guest Makes Reservation
**Location**: Guest books on our platform (public website)
- **Component**: `components/hotels/BookingForm.tsx` or `components/hotels/BookingModal.tsx`
- **Process**:
  1. Guest fills out booking form (dates, guest info, room selection)
  2. System creates/updates guest profile
  3. System gets or creates booking channel ("website")
  4. **Reservation created with status: `'tentative'`** (or `'confirmed'` if created from admin dashboard)
  5. Email notification sent (fire-and-forget)

**Reservation Details**:
- `reservation_status`: `'tentative'` (from website) or `'confirmed'` (from admin dashboard)
- `payment_status`: `'pending'`
- `octorate_push_status`: `'pending'` (will be pushed to Octorate)

#### Step 2: Push Booking to Octorate

**From Admin Dashboard** (`components/business/NewReservationModal.tsx`):
- ✅ **Already Implemented**: After creating reservation, checks if hotel uses Octorate
- If `pms_type === 'octorate'` and `octorate_connection_id` exists:
  - Calls `/api/octorate/bookings/push` in background
  - Updates reservation:
    - `octorate_booking_id`: Octorate's booking ID
    - `pushed_to_octorate_at`: Timestamp
    - `octorate_push_status`: `'pushed'`

**From Public Website** (`components/hotels/BookingForm.tsx`, `BookingModal.tsx`):
- ⚠️ **NOT YET IMPLEMENTED**: Currently only creates tentative booking
- **Should be added**: Check if hotel uses Octorate and push immediately

#### Step 3: Octorate Processes Booking
- Octorate receives the booking
- Hotel sees booking in Octorate PMS
- Hotel can confirm/reject in Octorate

#### Step 4: Hotel Confirms in Octorate
- Hotel confirms booking in Octorate
- **Octorate sends webhook** to our platform:
  - Event: `booking_confirmation`
  - Our webhook endpoint: `/api/octorate/webhook`
- **Our system updates reservation**:
  - `reservation_status`: `'confirmed'`
  - `octorate_push_status`: `'confirmed'`
  - `octorate_confirmation_received_at`: Timestamp
- Confirmation email sent to guest

#### Step 5: Booking is Active
- Booking appears in Availability Dashboard
- Availability synced from Octorate (read-only)
- Booking tracked in analytics
- Status can be updated from Octorate via webhooks

---

## 🔍 Current Implementation Status

### ✅ Implemented:

1. **Admin Dashboard** (`NewReservationModal.tsx`):
   - ✅ Checks if hotel uses Octorate
   - ✅ Pushes booking to Octorate after creation
   - ✅ Updates reservation with Octorate booking ID

2. **Webhook Processing** (`lib/services/octorate/webhooks.ts`):
   - ✅ Receives booking confirmations from Octorate
   - ✅ Updates reservation status to 'confirmed'

3. **Booking Management** (`BookingManagement.tsx`):
   - ✅ Shows Octorate push status
   - ✅ Shows Octorate booking ID
   - ✅ Shows push timestamp

### ⚠️ Missing/Needs Update:

1. **Public Website Booking** (`BookingForm.tsx`, `BookingModal.tsx`):
   - ⚠️ Creates tentative booking but **doesn't check for Octorate**
   - ⚠️ Should push to Octorate if hotel uses Octorate
   - **Action needed**: Add Octorate push logic

2. **Admin Approval** (`PendingReservations.tsx`):
   - ⚠️ Approves tentative bookings but **doesn't check for Octorate**
   - ⚠️ Should push to Octorate when approving if not already pushed
   - **Action needed**: Add Octorate push logic on approval

---

## 📊 Detailed Flow Diagrams

### Flow 1: Guest Booking (No Channel Manager)

```
Guest Books → Create Tentative Reservation → Admin Sees Notification
    ↓
Admin Reviews → Admin Approves → Calculate Pricing
    ↓
Status: 'confirmed' → Email Sent → Booking Active
```

### Flow 2: Guest Booking (With Octorate)

```
Guest Books → Create Tentative Reservation → Check if Octorate
    ↓
IF Octorate: Push to Octorate → Store Octorate Booking ID
    ↓
Hotel Confirms in Octorate → Webhook Received → Status: 'confirmed'
    ↓
Email Sent → Booking Active
```

### Flow 3: Admin Creates Booking (With Octorate)

```
Admin Creates → Status: 'confirmed' → Check if Octorate
    ↓
IF Octorate: Push to Octorate → Store Octorate Booking ID
    ↓
Hotel Confirms in Octorate → Webhook Received → Update Status
```

---

## 🔧 Implementation Recommendations

### 1. Update Public Website Booking Forms

**Files to update**:
- `components/hotels/BookingForm.tsx`
- `components/hotels/BookingModal.tsx`

**Changes needed**:
- After creating reservation, check if hotel uses Octorate
- If yes, push to Octorate in background
- Update reservation with push status

### 2. Update Admin Approval Flow

**File to update**:
- `components/business/PendingReservations.tsx`

**Changes needed**:
- When approving tentative booking, check if hotel uses Octorate
- If yes and not already pushed, push to Octorate
- Update reservation with push status

### 3. Handle Push Failures

**Considerations**:
- If push fails, show error in UI
- Allow retry mechanism
- Mark as `'failed'` in `octorate_push_status`
- Log errors for debugging

---

## 📝 Reservation Status Flow

### Without Channel Manager:
```
tentative → (admin approves) → confirmed → checked_in → checked_out
```

### With Octorate:
```
tentative → (push to Octorate) → pushed → (hotel confirms) → confirmed → checked_in → checked_out
```

---

## 🔐 Octorate-Specific Fields

When hotel uses Octorate, reservations include:
- `octorate_booking_id`: Booking ID from Octorate
- `pushed_to_octorate_at`: When we pushed the booking
- `octorate_push_status`: `'pending'`, `'pushed'`, `'confirmed'`, `'failed'`, or `'skipped'`
- `octorate_confirmation_received_at`: When hotel confirmed in Octorate

---

## 🎯 Key Points

1. **Tentative bookings**: All website bookings start as `'tentative'` (requires approval)
2. **Admin bookings**: Created directly from admin dashboard are `'confirmed'` immediately
3. **Octorate push**: Should happen immediately after reservation creation (if hotel uses Octorate)
4. **Webhook confirmation**: Hotel confirms in Octorate → webhook updates our reservation
5. **Status tracking**: We track push status separately from reservation status

---

**Last Updated**: Based on current implementation review
**Status**: Ready for implementation updates

