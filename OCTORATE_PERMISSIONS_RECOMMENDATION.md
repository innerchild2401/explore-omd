# Octorate API Permissions - Required Permissions

This document outlines which permissions we need for our OTA integration with Octorate.

---

## Our Role: OTA (Online Travel Agency)

As an OTA, we:
- **PULL** data FROM Octorate (hotels' inventory, availability, rates)
- **PUSH** bookings TO Octorate (when guests book on our platform)
- **RECEIVE** webhooks FROM Octorate (availability/rate updates, booking confirmations)

---

## ✅ REQUIRED Permissions

### 1. **Reading Property data** ✅ REQUIRED
**Why**: We need to pull accommodation data (property name, location, etc.) to display hotel information on our platform.

**Usage**: 
- Pull accommodation details when hotel connects their Octorate account
- Display hotel information to guests
- Map Octorate accommodations to our local hotel records

**Implementation**: `lib/services/octorate/accommodations.ts`

---

### 2. **Reading Calendar** ✅ REQUIRED
**Why**: We need availability, prices, and minimum stay requirements to show guests what's available and at what price.

**Usage**:
- Display real-time availability to guests
- Show pricing for different dates
- Enforce minimum stay requirements
- Check if rooms are available before allowing bookings

**Implementation**: `lib/services/octorate/availability.ts`, `lib/services/octorate/rates.ts`

---

### 3. **Reading Inventory / Products / Rooms** ✅ REQUIRED
**Why**: We need to pull room types from Octorate to display available rooms to guests.

**Usage**:
- Pull room types when hotel connects
- Display room information (name, max occupancy, amenities)
- Map Octorate room types to our local room records
- Show guests what room types are available

**Implementation**: `lib/services/octorate/rooms.ts`

---

### 4. **Writing Reservations** ✅ REQUIRED
**Why**: When a guest books on our platform, we need to push the booking to Octorate so the hotel receives it.

**Usage**:
- Push new bookings to Octorate when guests complete booking on our platform
- Store Octorate booking ID for tracking
- Handle booking confirmations from hotels

**Implementation**: `lib/services/octorate/bookings.ts`

---

### 5. **Subscribe events (webhooks)** ✅ REQUIRED
**Why**: We need to receive real-time updates from Octorate about availability, rate changes, and booking confirmations.

**Usage**:
- Receive availability updates when hotels change availability in Octorate
- Receive rate updates when hotels change prices in Octorate
- Receive booking confirmations when hotels confirm bookings
- Receive booking cancellations when bookings are cancelled

**Implementation**: `app/api/octorate/webhook/route.ts`, `lib/services/octorate/webhooks.ts`

---

## ❌ NOT NEEDED Permissions

### 6. **Reading Reservations** ❌ NOT NEEDED
**Why**: As an OTA, we create reservations on our platform and push them to Octorate. We don't need to read existing reservations from Octorate (hotels manage those in their PMS).

**Note**: We only read reservation status via webhooks when hotels confirm/cancel bookings.

---

### 7. **Sensitive informations** ❌ NOT NEEDED
**Why**: We collect and manage guest information (email, phone, documents) on our own platform. We don't need to access sensitive guest data from Octorate.

**Note**: We send guest information TO Octorate when pushing bookings, but we don't need to read it back.

---

### 8. **Accessing Content** ❌ NOT NEEDED
**Why**: We don't need to access Octorate's content management system. Hotels manage their content in Octorate, and we display our own content.

---

### 9. **Reading active OTA connections** ❌ NOT NEEDED
**Why**: We don't need to see what other OTAs hotels are connected to. This is hotel management information, not relevant for our OTA operations.

---

### 10. **Writing Property data** ❌ NOT NEEDED
**Why**: Hotels manage their properties in Octorate. We don't create or link properties. We only read property data to display on our platform.

---

### 11. **Writing Inventory / Products / Rooms** ❌ NOT NEEDED
**Why**: Hotels manage their inventory/rooms in Octorate. We only read this data to display to guests. We don't create or modify rooms.

---

### 12. **Writing Content** ❌ NOT NEEDED
**Why**: We manage our own content on our platform. We don't need to write content to Octorate.

---

### 13. **Connect the property to new OTA, change OTA configuration** ❌ NOT NEEDED
**Why**: This is hotel/PMS administrative functionality. As an OTA, we don't manage OTA connections - hotels do that in their Octorate dashboard.

---

### 14. **Writing Calendar** ❌ NOT NEEDED
**Why**: Hotels manage prices and availability in Octorate. We only read this data to display to guests. We don't modify prices or availability.

---

### 15. **License of the accounts** ❌ NOT NEEDED
**Why**: This is administrative/licensing functionality for Octorate accounts. As an OTA, we don't manage hotel licenses.

---

## Summary

### ✅ Required Permissions (5):
1. **Reading Property data** - Pull hotel/accommodation information
2. **Reading Calendar** - Pull availability, prices, min stay
3. **Reading Inventory / Products / Rooms** - Pull room types
4. **Writing Reservations** - Push bookings to Octorate
5. **Subscribe events (webhooks)** - Receive real-time updates

### ❌ Not Needed (10):
- Reading Reservations
- Sensitive informations
- Accessing Content
- Reading active OTA connections
- Writing Property data
- Writing Inventory / Products / Rooms
- Writing Content
- Connect property to new OTA
- Writing Calendar
- License management

---

## Can We Request More Permissions Later?

**Yes, you can request additional permissions later** if needed. However, Octorate may ask for justification on why you need additional permissions, so it's best to:

1. **Start with minimum required permissions** (listed above)
2. **Request additional permissions only if actually needed** for your use case
3. **Have clear justification** ready if Octorate asks why you need additional permissions

---

## Recommended Permissions for Form

When filling out the Octorate form, select **ONLY** these 5 permissions:

- ✅ Reading Property data
- ✅ Reading Calendar (Price, Availability, MinStay, etc...)
- ✅ Reading Inventory / Products / Rooms
- ✅ Writing Reservations
- ✅ Subscribe events (webhooks)

---

**Last Updated**: Based on OTA integration requirements
**Status**: Ready for Octorate form submission

