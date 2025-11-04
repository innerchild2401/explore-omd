# Octorate Integration Implementation Plan (OTA Perspective)

## Executive Summary

This document outlines the comprehensive plan to integrate Octorate PMS/Channel Manager into the explore-omd platform as an **OTA integration**. Our platform acts as an Online Travel Agency that receives inventory, availability, and rates from hotels who use Octorate as their PMS, and pushes bookings to those hotels via Octorate.

**Integration Flow:**
- Hotels connect their Octorate account to our platform
- We **RECEIVE** inventory/rooms, availability, and rates from Octorate
- We **PUSH** bookings to Octorate when guests book on our platform
- We **RECEIVE** booking confirmations from Octorate

**Estimated Timeline:** 4-6 weeks  
**Complexity:** Medium-High  
**Priority:** High (best documented channel manager)

---

## 1. Current System Analysis

### 1.1 Existing Architecture

**Our Platform Role:** OTA (Online Travel Agency)
- We display hotels and allow guests to book
- Hotels can either:
  - Use our built-in PMS (dashboard) - No channel manager needed
  - Use external PMS (like Octorate) - We integrate as an OTA

**Database Schema:**
- `businesses` / `hotels` - Hotel listings
- `reservations` - Core booking table with `channel_id` reference
- `booking_channels` - Channel definitions (we are one channel)
- `rooms` - Room definitions (can be synced FROM Octorate)
- `room_pricing` - Date-specific pricing rules (can be synced FROM Octorate)
- `room_availability` - Real-time availability tracking (can be synced FROM Octorate)
- `guest_profiles` - Guest information
- `individual_rooms` - Individual room instances (if hotel uses our PMS)

**Current Booking Flow (Our Platform):**
1. Guest searches hotels on our platform
2. Guest selects dates and room
3. Guest submits booking → `BookingModal.tsx`
4. Creates reservation in `reservations` table
5. If hotel uses our PMS: Direct booking in our system
6. If hotel uses Octorate: **WE NEED TO PUSH TO OCTORATE**

**Current Data Flow:**
- Hotels using our PMS: Manage inventory directly in dashboard
- Hotels using Octorate: **WE NEED TO RECEIVE** their inventory/rates/availability

---

## 2. Required Changes Overview

### 2.1 Database Schema Changes

#### NEW TABLES TO CREATE:

1. **`octorate_hotel_connections`** (NEW)
   - Store OAuth tokens for hotels connected via Octorate
   - Link to `businesses` or `hotels`
   - Store Octorate accommodation ID (hotel's property in Octorate)

2. **`octorate_room_mappings`** (NEW)
   - Map Octorate room types TO our local `rooms` table
   - Store Octorate room type IDs
   - Store which rooms are synced FROM Octorate (not managed locally)

3. **`octorate_sync_queue`** (NEW)
   - Queue for async sync operations (pulling data, pushing bookings)
   - Prevents rate limit issues

4. **`octorate_webhook_events`** (NEW)
   - Store incoming webhook events from Octorate
   - Availability/rate updates from hotels
   - Booking confirmations from hotels

5. **`octorate_synced_data`** (NEW - Optional)
   - Track which data came from Octorate
   - Mark rooms/rates/availability as "synced from Octorate" (read-only in our UI)

#### TABLES TO MODIFY:

1. **`hotels` / `businesses`** (MODIFY)
   - Add: `pms_type` - 'internal' (our PMS) or 'octorate' (external PMS)
   - Add: `octorate_connection_id` - Link to `octorate_hotel_connections`
   - Add: `data_source` - 'local' or 'octorate_sync'

2. **`rooms`** (MODIFY)
   - Add: `octorate_room_id` - External room ID from Octorate
   - Add: `is_synced_from_octorate` - Boolean flag
   - Add: `last_synced_at` - Last sync timestamp
   - If synced from Octorate: Make read-only in UI (hotel manages in Octorate)

3. **`room_pricing`** (MODIFY)
   - Add: `is_synced_from_octorate` - Boolean flag
   - Add: `last_synced_at` - Track sync time
   - If synced from Octorate: Make read-only in UI

4. **`room_availability`** (MODIFY)
   - Add: `is_synced_from_octorate` - Boolean flag
   - Add: `last_synced_at` - Track sync time
   - If synced from Octorate: Make read-only in UI

5. **`reservations`** (MODIFY)
   - Add: `octorate_booking_id` - Booking ID returned from Octorate when we push
   - Add: `pushed_to_octorate_at` - When we pushed booking to Octorate
   - Add: `octorate_push_status` - 'pending', 'pushed', 'confirmed', 'failed'
   - Add: `octorate_confirmation_received_at` - When hotel confirmed via Octorate

---

### 2.2 API Routes to Create

#### NEW API ROUTES:

1. **`/api/octorate/oauth/callback`** (GET)
   - Handle OAuth 2.0 callback from Octorate
   - Hotel owner connects their Octorate account
   - Exchange authorization code for tokens
   - Store tokens securely

2. **`/api/octorate/oauth/authorize`** (GET)
   - Initiate OAuth flow for hotel
   - Redirect hotel owner to Octorate authorization URL

3. **`/api/octorate/webhook`** (POST)
   - Receive webhooks from Octorate
   - Handle `PORTAL_SUBSCRIPTION_CALENDAR` events (availability/rate updates)
   - Update our local `rooms`, `room_pricing`, `room_availability`
   - Handle booking confirmations from hotels

4. **`/api/octorate/sync/inventory`** (POST)
   - Pull hotels' accommodations and rooms FROM Octorate
   - Create/update local `rooms` table
   - Initial sync when hotel connects

5. **`/api/octorate/sync/availability`** (POST)
   - Pull availability FROM Octorate
   - Update local `room_availability` table
   - Can be triggered manually or via webhook

6. **`/api/octorate/sync/rates`** (POST)
   - Pull rates FROM Octorate
   - Update local `room_pricing` table
   - Can be triggered manually or via webhook

7. **`/api/octorate/bookings/push`** (POST)
   - **PUSH booking TO Octorate** when guest books on our platform
   - Create booking in Octorate
   - Store `octorate_booking_id` in our reservation

8. **`/api/octorate/bookings/status`** (GET)
   - Check booking status in Octorate
   - Get confirmation from hotel

9. **`/api/octorate/sync/status`** (GET)
   - Get sync status for a hotel
   - Last sync times, errors, queue status
   - Connection health check

---

### 2.3 Service Layer to Create

#### NEW SERVICE FILES:

1. **`lib/services/octorate/`** (NEW DIRECTORY)
   ```
   /octorate
     - client.ts           # Base API client with OAuth
     - auth.ts             # OAuth flow management
     - accommodations.ts   # Pull accommodations FROM Octorate
     - rooms.ts            # Pull room types FROM Octorate
     - availability.ts     # Pull availability FROM Octorate
     - rates.ts            # Pull rates FROM Octorate
     - bookings.ts         # PUSH bookings TO Octorate
     - webhooks.ts         # Process webhooks FROM Octorate
     - types.ts            # TypeScript types
     - queue.ts            # Sync queue management
   ```

2. **`lib/services/octorate/client.ts`** (NEW)
   - REST API client with automatic token refresh
   - Rate limiting (100 calls per accommodation per 5 min)
   - Error handling and retry logic
   - Request/response logging
   - Per-hotel token management (each hotel has their own tokens)

3. **`lib/services/octorate/auth.ts`** (NEW)
   - OAuth 2.0 flow implementation
   - Token storage per hotel (encrypted in database)
   - Token refresh logic per hotel
   - Authorization URL generation
   - Disconnect hotel from Octorate

---

### 2.4 Components to Create/Modify

#### NEW COMPONENTS:

1. **`components/business/OctorateConnection.tsx`** (NEW)
   - "Connect Octorate Account" button/flow
   - OAuth connection UI for hotel owner
   - Show connection status
   - Disconnect option
   - Select which Octorate accommodation to connect

2. **`components/business/OctorateSyncStatus.tsx`** (NEW)
   - Display sync status dashboard
   - Last sync times (inventory, rates, availability)
   - Error logs
   - Manual sync triggers (pull from Octorate)
   - Queue status
   - Show which data is synced from Octorate (read-only indicator)

#### COMPONENTS TO MODIFY:

1. **`components/business/HotelBasicInfo.tsx`** (MODIFY)
   - Add "PMS Connection" section
   - Radio: "Use our PMS" vs "Connect Octorate"
   - If Octorate: Show connection status and sync button
   - Hide pricing/availability management if using Octorate

2. **`components/business/PricingCalendar.tsx`** (MODIFY)
   - **IF synced from Octorate:** Show read-only indicator
   - **IF synced from Octorate:** Disable editing, show "Managed in Octorate"
   - **IF our PMS:** Keep existing functionality
   - Add "Refresh from Octorate" button if connected

3. **`components/business/AvailabilityDashboard.tsx`** (MODIFY)
   - **IF synced from Octorate:** Show read-only indicator
   - **IF synced from Octorate:** Disable editing, show "Managed in Octorate"
   - **IF our PMS:** Keep existing functionality
   - Add "Refresh from Octorate" button if connected

4. **`components/business/BookingManagement.tsx`** (MODIFY)
   - Show Octorate booking ID if booking was pushed
   - Show push status (pending, confirmed, failed)
   - Show "Pushed to Octorate" timestamp
   - Show booking confirmation from hotel

5. **`components/business/NewReservationModal.tsx`** (MODIFY)
   - **IF hotel uses Octorate:** After creating reservation, **PUSH to Octorate**
   - Show "Pushing to Octorate..." status
   - Show confirmation when pushed
   - Handle errors if push fails

6. **`components/business/RoomModal.tsx`** (MODIFY)
   - **IF synced from Octorate:** Show read-only indicator
   - **IF synced from Octorate:** Disable editing
   - Show "Synced from Octorate" badge

7. **`components/hotels/BookingModal.tsx`** (MODIFY)
   - Check if hotel uses Octorate
   - After booking submission, trigger push to Octorate
   - Show status: "Processing with hotel's system..."

---

### 2.5 Database Functions to Create

#### NEW FUNCTIONS:

1. **`pull_availability_from_octorate()`**
   - Pull availability FROM Octorate
   - Update local `room_availability` table
   - Mark as synced from Octorate

2. **`pull_rates_from_octorate()`**
   - Pull rates FROM Octorate
   - Update local `room_pricing` table
   - Mark as synced from Octorate

3. **`process_octorate_webhook()`**
   - Process incoming webhook events FROM Octorate
   - Update availability/rates from hotels
   - Handle booking confirmations from hotels

4. **`push_booking_to_octorate()`**
   - Push booking TO Octorate when guest books
   - Store Octorate booking ID
   - Update push status

5. **`mark_octorate_synced_data()`**
   - Mark rooms/rates/availability as read-only
   - Prevent manual edits to synced data

---

### 2.6 Background Jobs/Queue System

#### REQUIRED INFRASTRUCTURE:

1. **Sync Queue System**
   - Use Redis or database-based queue
   - Process sync jobs asynchronously (pulling data FROM Octorate)
   - Process booking push jobs (pushing bookings TO Octorate)
   - Respect rate limits (100 calls/5min per accommodation)
   - Retry failed jobs

2. **Cron Jobs/Workers**
   - Periodic sync for availability/rates FROM Octorate (fallback if webhooks fail)
   - Retry failed booking pushes
   - Check booking status in Octorate
   - Cleanup old sync logs
   - Health checks for hotel connections

---

## 3. Integration Flow (OTA Perspective)

### 3.1 Hotel Connection Flow
1. Hotel owner signs up/logs in to our platform
2. Hotel owner goes to settings → "Connect PMS"
3. Hotel owner selects "Connect Octorate Account"
4. OAuth flow: Hotel owner authorizes our platform to access their Octorate
5. We store tokens for that hotel
6. We pull their accommodations and select which one to connect
7. We pull initial inventory (rooms, rates, availability)

### 3.2 Data Sync Flow (INBOUND - FROM Octorate)
1. **Initial Sync:**
   - Pull accommodations → Create/update local `hotels`
   - Pull room types → Create/update local `rooms` (marked as synced)
   - Pull rates → Create/update local `room_pricing` (marked as synced)
   - Pull availability → Update local `room_availability` (marked as synced)

2. **Ongoing Sync (via Webhooks):**
   - Hotel updates availability in Octorate → Webhook → Update our `room_availability`
   - Hotel updates rates in Octorate → Webhook → Update our `room_pricing`
   - Hotel updates rooms in Octorate → Webhook → Update our `rooms`

3. **Fallback Sync (Polling):**
   - Periodic checks if webhooks missed anything
   - Pull latest data from Octorate

### 3.3 Booking Flow (OUTBOUND - TO Octorate)
1. Guest searches on our platform
2. Guest sees availability/rates (synced from Octorate)
3. Guest submits booking on our platform
4. We create reservation in our `reservations` table
5. **We push booking TO Octorate** via API
6. Octorate returns booking ID
7. We store `octorate_booking_id` in our reservation
8. Hotel confirms in Octorate
9. **Octorate sends webhook** → We update reservation status to "confirmed"

### 3.4 UI Behavior
- **Hotels using our PMS:** Full editing capabilities (pricing, availability, etc.)
- **Hotels using Octorate:** Read-only data with "Synced from Octorate" indicators
- **Hotels using Octorate:** "Refresh from Octorate" button to manually sync
- **Hotels using Octorate:** Booking status shows "Pushed to Octorate" and confirmation status

---

## 4. Detailed Implementation Plan

### Phase 1: Foundation & Authentication (Week 1)

#### 4.1.1 Database Schema

**Migration: `53_octorate_integration_schema.sql`**

```sql
-- 1. Octorate hotel connections table (OTA perspective)
CREATE TABLE octorate_hotel_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- OAuth credentials (encrypted) - Each hotel has their own tokens
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT NOT NULL, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  
  -- Octorate accommodation ID (hotel's property in Octorate)
  octorate_accommodation_id TEXT NOT NULL,
  
  -- Sync settings
  auto_sync_availability BOOLEAN DEFAULT true, -- Pull availability via webhooks
  auto_sync_rates BOOLEAN DEFAULT true, -- Pull rates via webhooks
  sync_interval_minutes INTEGER DEFAULT 60, -- Fallback polling interval
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_connected BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_inventory_sync_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(hotel_id)
);

-- 2. Room mappings (Map Octorate rooms TO our local rooms)
CREATE TABLE octorate_room_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  octorate_connection_id UUID NOT NULL REFERENCES octorate_hotel_connections(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  octorate_room_id TEXT NOT NULL, -- Octorate room type ID
  
  -- Mapping metadata
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(octorate_connection_id, room_id),
  UNIQUE(octorate_connection_id, octorate_room_id)
);

-- 3. Sync queue (For pulling data FROM Octorate and pushing bookings TO Octorate)
CREATE TABLE octorate_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  octorate_connection_id UUID NOT NULL REFERENCES octorate_hotel_connections(id) ON DELETE CASCADE,
  
  sync_type TEXT NOT NULL CHECK (sync_type IN (
    'pull_inventory',      -- Pull rooms FROM Octorate
    'pull_availability',   -- Pull availability FROM Octorate
    'pull_rates',          -- Pull rates FROM Octorate
    'push_booking',        -- PUSH booking TO Octorate
    'check_booking_status' -- Check booking status in Octorate
  )),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  entity_type TEXT, -- 'room', 'pricing', 'availability', 'reservation'
  entity_id UUID, -- Local entity ID (for push_booking)
  
  payload JSONB, -- Data to sync (for push) or received data (for pull)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Webhook events log (Incoming events FROM Octorate)
CREATE TABLE octorate_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  octorate_connection_id UUID NOT NULL REFERENCES octorate_hotel_connections(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL, -- 'PORTAL_SUBSCRIPTION_CALENDAR', 'booking_confirmation', etc.
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 5. Modify hotels/businesses table
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS pms_type TEXT DEFAULT 'internal' 
  CHECK (pms_type IN ('internal', 'octorate'));
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS octorate_connection_id UUID REFERENCES octorate_hotel_connections(id);

-- 6. Modify reservations table (for pushing bookings TO Octorate)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS octorate_booking_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS pushed_to_octorate_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS octorate_push_status TEXT DEFAULT 'pending' 
  CHECK (octorate_push_status IN ('pending', 'pushed', 'confirmed', 'failed', 'skipped'));
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS octorate_confirmation_received_at TIMESTAMPTZ;

-- 7. Modify rooms table (for synced data FROM Octorate)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS octorate_room_id TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_synced_from_octorate BOOLEAN DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_synced_from_octorate_at TIMESTAMPTZ;

-- 8. Modify room_pricing table (for synced rates FROM Octorate)
ALTER TABLE room_pricing ADD COLUMN IF NOT EXISTS is_synced_from_octorate BOOLEAN DEFAULT false;
ALTER TABLE room_pricing ADD COLUMN IF NOT EXISTS last_synced_from_octorate_at TIMESTAMPTZ;

-- 9. Modify room_availability table (for synced availability FROM Octorate)
ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS is_synced_from_octorate BOOLEAN DEFAULT false;
ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS last_synced_from_octorate_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX idx_octorate_connections_hotel_id ON octorate_hotel_connections(hotel_id);
CREATE INDEX idx_octorate_connections_business_id ON octorate_hotel_connections(business_id);
CREATE INDEX idx_octorate_room_mappings_room_id ON octorate_room_mappings(room_id);
CREATE INDEX idx_octorate_room_mappings_connection_id ON octorate_room_mappings(octorate_connection_id);
CREATE INDEX idx_octorate_sync_queue_status ON octorate_sync_queue(status, scheduled_at);
CREATE INDEX idx_octorate_sync_queue_connection_id ON octorate_sync_queue(octorate_connection_id);
CREATE INDEX idx_octorate_sync_queue_direction ON octorate_sync_queue(direction);
CREATE INDEX idx_octorate_webhook_events_processed ON octorate_webhook_events(processed, created_at);
CREATE INDEX idx_reservations_octorate_booking_id ON reservations(octorate_booking_id);
CREATE INDEX idx_reservations_octorate_push_status ON reservations(octorate_push_status);
CREATE INDEX idx_rooms_synced_from_octorate ON rooms(is_synced_from_octorate) WHERE is_synced_from_octorate = true;
```

#### 4.1.2 OAuth Implementation

**Files to Create:**
- `lib/services/octorate/auth.ts` - OAuth flow (per-hotel tokens)
- `lib/services/octorate/client.ts` - API client (with token refresh)
- `app/api/octorate/oauth/authorize/route.ts`
- `app/api/octorate/oauth/callback/route.ts`

**Changes:**
- Implement OAuth 2.0 authorization code flow
- Hotel owner connects their Octorate account to our platform
- Store tokens per hotel (encrypted in database)
- Handle token refresh automatically per hotel
- Add token expiration handling

---

### Phase 2: Inventory Pull & Mapping (Week 2)

#### 4.2.1 Pull Accommodations FROM Octorate

**Files to Create:**
- `lib/services/octorate/accommodations.ts`
- `app/api/octorate/sync/inventory/route.ts`
- `components/business/OctorateConnection.tsx`

**Changes:**
- **PULL** hotels' accommodations FROM Octorate (after OAuth)
- Hotel owner selects which Octorate accommodation to connect
- Store `octorate_accommodation_id` in `octorate_hotel_connections`
- Link to our local `hotels` table

#### 4.2.2 Pull Room Types FROM Octorate

**Files to Create:**
- `lib/services/octorate/rooms.ts`
- `app/api/octorate/sync/inventory/route.ts`

**Changes:**
- **PULL** room types FROM Octorate
- Create/update local `rooms` table
- Mark as `is_synced_from_octorate = true`
- Store mappings in `octorate_room_mappings` table
- UI shows synced rooms as read-only

---

### Phase 3: Pull Availability FROM Octorate (Week 2-3)

#### 4.3.1 Availability Pull Service

**Files to Create:**
- `lib/services/octorate/availability.ts`
- `app/api/octorate/sync/availability/route.ts`

**Changes:**
- **PULL** availability FROM Octorate
- Update local `room_availability` table
- Mark as `is_synced_from_octorate = true`
- Handle rate limits (queue system)
- Batch updates when possible

#### 4.3.2 Integration Points

**Components to Modify:**
- `AvailabilityDashboard.tsx` - Show read-only indicator if synced, add "Refresh" button
- `IndividualRoomAvailabilityDashboard.tsx` - Same as above
- **NO database triggers** - We don't push, we only pull

**Database Functions:**
- `update_availability_from_octorate()` - Update from Octorate data
- Mark synced availability as read-only

---

### Phase 4: Pull Rates FROM Octorate (Week 3)

#### 4.4.1 Rate Pull Service

**Files to Create:**
- `lib/services/octorate/rates.ts`
- `app/api/octorate/sync/rates/route.ts`

**Changes:**
- **PULL** rates FROM Octorate
- Update local `room_pricing` table
- Mark as `is_synced_from_octorate = true`
- Map Octorate rate plans to our pricing structure
- Handle date ranges and pricing rules

#### 4.4.2 Integration Points

**Components to Modify:**
- `PricingCalendar.tsx` - Show read-only indicator if synced, add "Refresh" button
- `PricingCalendarModal.tsx` - Disable editing if synced from Octorate
- **NO database triggers** - We don't push, we only pull

**Database Functions:**
- `update_rates_from_octorate()` - Update from Octorate data
- Mark synced pricing as read-only

---

### Phase 5: Push Bookings TO Octorate (Week 4)

#### 4.5.1 Push Booking Service

**Files to Create:**
- `lib/services/octorate/bookings.ts` (push)
- `app/api/octorate/bookings/push/route.ts`

**Changes:**
- **PUSH** bookings TO Octorate when guest books on our platform
- Create booking in Octorate via API
- Store `octorate_booking_id` returned from Octorate
- Update `octorate_push_status` in our reservation
- Handle errors and retries

#### 4.5.2 Booking Confirmation Flow

**Changes:**
- Hotel confirms booking in Octorate
- Octorate sends webhook with confirmation
- We update local reservation status to "confirmed"
- Send confirmation email to guest

**Components to Modify:**
- `BookingModal.tsx` - After booking, push to Octorate, show status
- `NewReservationModal.tsx` - Same as above
- `BookingManagement.tsx` - Show push status, Octorate booking ID
- `ReservationDetailModal.tsx` - Show push status and confirmation

---

### Phase 6: Webhooks FROM Octorate (Week 4-5)

#### 4.6.1 Webhook Handler

**Files to Create:**
- `lib/services/octorate/webhooks.ts`
- `app/api/octorate/webhook/route.ts`

**Changes:**
- Receive `PORTAL_SUBSCRIPTION_CALENDAR` events FROM Octorate
- Process availability/rate updates FROM hotels
- Update local `room_availability` and `room_pricing`
- Handle booking confirmations from hotels
- Log events in `octorate_webhook_events`

#### 4.6.2 Webhook Processing

**Database Functions:**
- `process_octorate_webhook()` - Process webhook payload FROM Octorate
- Update `room_availability` from webhook (hotel changed availability)
- Update `room_pricing` from webhook (hotel changed rates)
- Update `reservations` status from webhook (hotel confirmed booking)

---

### Phase 7: Queue System & Background Jobs (Week 5)

#### 3.7.1 Sync Queue

**Files to Create:**
- `lib/services/octorate/queue.ts`
- Worker/background job processor

**Changes:**
- Process sync queue items
- Respect rate limits (100 calls/5min per accommodation)
- Retry failed syncs
- Exponential backoff

#### 3.7.2 Background Jobs

**Infrastructure:**
- Set up cron jobs or background workers
- Periodic sync for reservations
- Retry failed syncs
- Cleanup old logs

---

### Phase 8: UI Components & Testing (Week 6)

#### 3.8.1 Configuration UI

**Files to Create:**
- `components/business/OctorateConfig.tsx`
- `components/business/OctorateSyncStatus.tsx`

**Changes:**
- OAuth connection flow
- Accommodation mapping
- Room mapping
- Sync settings
- Status dashboard

#### 3.8.2 Integration in Existing UI

**Files to Modify:**
- `components/business/HotelBasicInfo.tsx` - Add "Channel Manager" tab
- All booking/availability components - Add sync indicators

#### 3.8.3 Testing

- Unit tests for services
- Integration tests with Octorate sandbox
- End-to-end testing
- Load testing for rate limits

---

## 5. Data Flow Diagrams (OTA Perspective)

### 5.1 Inventory Pull Flow (FROM Octorate)

```
Hotel Connects → OAuth → Pull Accommodations → Pull Rooms → Pull Rates → Pull Availability 
→ Update Local Tables → Mark as Synced → Show Read-Only in UI
```

### 5.2 Availability Sync Flow (FROM Octorate)

```
Hotel Updates in Octorate → Octorate Webhook → Our Webhook Endpoint 
→ Process Event → Update room_availability → Mark as Synced → UI Refreshes
```

### 5.3 Rate Sync Flow (FROM Octorate)

```
Hotel Updates in Octorate → Octorate Webhook → Our Webhook Endpoint 
→ Process Event → Update room_pricing → Mark as Synced → UI Refreshes
```

### 5.4 Booking Push Flow (TO Octorate)

```
Guest Books on Our Platform → Create Local Reservation → Queue Push Job 
→ Background Worker → Rate Limit Check → Push to Octorate API → Store Booking ID 
→ Update Push Status → Show Confirmation
```

### 5.5 Booking Confirmation Flow (FROM Octorate)

```
Hotel Confirms in Octorate → Octorate Webhook → Our Webhook Endpoint 
→ Process Confirmation → Update Reservation Status → Send Email to Guest
```

---

## 6. Security Considerations

### 5.1 Credential Storage
- **Encrypt** `client_secret`, `access_token`, `refresh_token` in database
- Use Supabase Vault or similar encryption
- Never log sensitive credentials

### 5.2 OAuth Flow
- Use secure redirect URIs
- Validate state parameter
- Store tokens securely
- Auto-refresh expired tokens

### 5.3 Webhook Security
- Verify webhook signatures (if provided by Octorate)
- Validate payload structure
- Rate limit webhook endpoint
- Log all webhook events

### 5.4 API Security
- Use HTTPS for all API calls
- Implement rate limiting
- Add request timeout
- Handle errors gracefully

---

## 7. Error Handling & Resilience

### 6.1 Error Scenarios
- **Token Expired:** Auto-refresh
- **Rate Limit:** Queue and retry later
- **Network Error:** Retry with exponential backoff
- **Invalid Data:** Log error, skip sync
- **API Changes:** Version checking

### 6.2 Retry Logic
- Retry failed syncs up to 3 times
- Exponential backoff (1s, 2s, 4s)
- Mark as failed after max retries
- Alert admin for manual intervention

### 6.3 Monitoring
- Log all API calls
- Track success/failure rates
- Monitor queue size
- Alert on repeated failures

---

## 8. Testing Strategy

### 7.1 Unit Tests
- OAuth flow
- API client methods
- Data mapping functions
- Error handling

### 7.2 Integration Tests
- Full sync flows
- Webhook processing
- Queue processing
- Token refresh

### 7.3 End-to-End Tests
- Complete booking flow with sync
- Availability sync end-to-end
- Rate sync end-to-end
- Webhook processing

### 7.4 Load Testing
- Rate limit handling
- Queue processing under load
- Concurrent webhook processing

---

## 9. Deployment Plan

### 8.1 Pre-Deployment
- Set up Octorate sandbox account
- Configure OAuth application
- Test in staging environment
- Prepare rollback plan

### 8.2 Deployment Steps
1. Run database migration
2. Deploy API routes
3. Deploy service layer
4. Deploy UI components
5. Set up background workers
6. Configure webhook endpoint
7. Enable for test hotel
8. Monitor for issues

### 8.3 Post-Deployment
- Monitor logs
- Track sync success rates
- Gather user feedback
- Fix issues promptly

---

## 10. Documentation Requirements

### 9.1 User Documentation
- How to connect Octorate
- How to map accommodations/rooms
- How to configure sync settings
- Troubleshooting guide

### 9.2 Developer Documentation
- API integration guide
- Service layer architecture
- Database schema
- Error codes reference

---

## 11. Success Metrics

### 10.1 Technical Metrics
- Sync success rate > 95%
- Average sync latency < 5 seconds
- Zero credential leaks
- Queue processing time < 1 minute

### 10.2 Business Metrics
- Number of hotels connected
- Reservations synced per day
- Reduction in manual work
- User satisfaction

---

## 12. Risk Assessment

### 11.1 High Risk
- **Rate Limits:** Could block syncs if not handled properly
- **Data Conflicts:** Local vs Octorate data mismatches
- **Token Expiration:** Could break syncs if refresh fails

### 11.2 Medium Risk
- **API Changes:** Octorate API updates could break integration
- **Performance:** Large number of rooms could slow syncs
- **Webhook Reliability:** Webhooks might be missed

### 11.3 Mitigation
- Comprehensive error handling
- Retry mechanisms
- Monitoring and alerts
- Manual reconciliation tools
- Regular API health checks

---

## 13. Future Enhancements

### 13.1 Phase 2 Features
- Multi-PMS support (other PMS systems besides Octorate)
- Advanced conflict resolution
- Booking modification sync (modify/cancel bookings in Octorate)
- Analytics dashboard for booking performance from Octorate hotels

### 13.2 Integration Expansion
- Support for other PMS systems (SiteMinder, OTA Sync, Otorate)
- Direct PMS integrations (other channel managers)
- Enhanced booking confirmation flows

---

## 14. Files to Create/Modify Summary

### NEW FILES (Approximately 25-30 files):

**Database:**
- `migrations/53_octorate_integration_schema.sql`

**Services:**
- `lib/services/octorate/client.ts`
- `lib/services/octorate/auth.ts`
- `lib/services/octorate/types.ts`
- `lib/services/octorate/accommodations.ts` (pull FROM Octorate)
- `lib/services/octorate/rooms.ts` (pull FROM Octorate)
- `lib/services/octorate/availability.ts` (pull FROM Octorate)
- `lib/services/octorate/rates.ts` (pull FROM Octorate)
- `lib/services/octorate/bookings.ts` (push TO Octorate)
- `lib/services/octorate/webhooks.ts` (receive FROM Octorate)
- `lib/services/octorate/queue.ts`

**API Routes:**
- `app/api/octorate/oauth/authorize/route.ts`
- `app/api/octorate/oauth/callback/route.ts`
- `app/api/octorate/webhook/route.ts` (receive FROM Octorate)
- `app/api/octorate/sync/inventory/route.ts` (pull FROM Octorate)
- `app/api/octorate/sync/availability/route.ts` (pull FROM Octorate)
- `app/api/octorate/sync/rates/route.ts` (pull FROM Octorate)
- `app/api/octorate/bookings/push/route.ts` (push TO Octorate)
- `app/api/octorate/bookings/status/route.ts`
- `app/api/octorate/sync/status/route.ts`

**Components:**
- `components/business/OctorateConnection.tsx` (connect hotel's Octorate account)
- `components/business/OctorateSyncStatus.tsx`

**Types:**
- `types/octorate.ts`

### MODIFIED FILES (Approximately 10-15 files):

**Components:**
- `components/business/HotelBasicInfo.tsx` - Add PMS connection section
- `components/business/PricingCalendar.tsx` - Show read-only if synced, disable editing
- `components/business/AvailabilityDashboard.tsx` - Show read-only if synced, disable editing
- `components/business/IndividualRoomAvailabilityDashboard.tsx` - Same as above
- `components/business/BookingManagement.tsx` - Show push status, Octorate booking ID
- `components/business/NewReservationModal.tsx` - Push to Octorate after creation
- `components/business/ReservationDetailModal.tsx` - Show push status
- `components/business/RoomModal.tsx` - Show read-only if synced
- `components/hotels/BookingModal.tsx` - Push to Octorate after booking

**Types:**
- `types/index.ts` - Add Octorate-related types

**Database Functions:**
- Add triggers for auto-sync
- Add sync queue functions

---

## 15. Dependencies to Add

### 14.1 New npm Packages
```json
{
  "axios": "^1.6.0",  // HTTP client (if not already present)
  "jsonwebtoken": "^9.0.0",  // JWT handling (if needed)
  "crypto-js": "^4.2.0",  // Encryption for credentials
  "bull" or "bullmq": "^4.0.0",  // Queue system (optional, can use DB queue)
  "zod": "^3.22.0"  // Schema validation (if not already present)
}
```

### 14.2 Environment Variables
```env
OCTORATE_API_BASE_URL=https://api.octorate.com
OCTORATE_OAUTH_URL=https://api.octorate.com/connect
OCTORATE_WEBHOOK_SECRET=<webhook_secret>
ENCRYPTION_KEY=<for_encrypting_tokens>
```

---

## 16. Implementation Checklist

### Phase 1: Foundation
- [ ] Create database migration
- [ ] Implement OAuth flow (hotel connects their Octorate)
- [ ] Create API client (with per-hotel tokens)
- [ ] Set up credential encryption

### Phase 2: Inventory Pull
- [ ] Pull accommodations FROM Octorate
- [ ] Pull room types FROM Octorate
- [ ] Create/update local rooms (marked as synced)
- [ ] Connection UI

### Phase 3: Pull Availability
- [ ] Pull availability FROM Octorate
- [ ] Update local room_availability (marked as synced)
- [ ] Queue system for rate limits
- [ ] UI shows read-only indicator

### Phase 4: Pull Rates
- [ ] Pull rates FROM Octorate
- [ ] Update local room_pricing (marked as synced)
- [ ] UI shows read-only indicator, disables editing

### Phase 5: Push Bookings
- [ ] Push bookings TO Octorate
- [ ] Store Octorate booking ID
- [ ] Handle push errors
- [ ] UI shows push status

### Phase 6: Webhooks
- [ ] Webhook endpoint (receive FROM Octorate)
- [ ] Process availability/rate updates
- [ ] Process booking confirmations
- [ ] Update local data

### Phase 7: Queue & Jobs
- [ ] Queue processor
- [ ] Background workers
- [ ] Rate limit handling (100 calls/5min)
- [ ] Periodic sync fallback

### Phase 8: UI & Testing
- [ ] Connection UI
- [ ] Status dashboard
- [ ] Read-only indicators
- [ ] Testing
- [ ] Documentation

---

## 17. Estimated Effort

**Total: 4-6 weeks (1 developer)**

- Phase 1: 1 week
- Phase 2: 1 week
- Phase 3: 1 week
- Phase 4: 0.5 weeks
- Phase 5: 1 week
- Phase 6: 0.5 weeks
- Phase 7: 0.5 weeks
- Phase 8: 0.5 weeks
- Buffer: 1 week

---

## Conclusion

This plan provides a comprehensive roadmap for integrating Octorate into the explore-omd platform **as an OTA**. Our platform acts as an Online Travel Agency that:

- **RECEIVES** inventory, availability, and rates FROM hotels who use Octorate
- **PUSHES** bookings TO hotels via Octorate when guests book on our platform
- **RECEIVES** booking confirmations FROM hotels via Octorate

Hotels using Octorate will have their data synced to our platform (read-only in our UI), and bookings made on our platform will be pushed to their Octorate system for confirmation.

The modular approach allows for incremental development and testing. The queue system ensures reliable syncing even under rate limits, and the webhook integration provides real-time updates from hotels.

**Key Differences from PMS Integration:**
- We **PULL** data FROM Octorate (not push)
- We **PUSH** bookings TO Octorate (not pull)
- Synced data is **READ-ONLY** in our UI
- Hotels manage their data in Octorate, we just display it

**Next Steps:**
1. Review and approve this plan
2. Set up Octorate sandbox account
3. Obtain API credentials (client_id, client_secret)
4. Begin Phase 1 implementation

