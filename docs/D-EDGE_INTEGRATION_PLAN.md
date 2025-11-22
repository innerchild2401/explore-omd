# D-Edge Integration Implementation Plan (OTA Perspective)

## Executive Summary

This document outlines the comprehensive plan to integrate D-Edge Channel Manager into the explore-omd platform as an **OTA integration**, following the same pattern as our Octorate integration. Our platform acts as an Online Travel Agency that receives inventory, availability, and rates from hotels who use D-Edge as their Channel Manager, and pushes bookings to those hotels via D-Edge.

**Integration Flow:**
- Hotels connect their D-Edge account to our platform
- We **RECEIVE** inventory/rooms, availability, and rates from D-Edge
- We **PUSH** bookings to D-Edge when guests book on our platform
- We **RECEIVE** booking confirmations from D-Edge

**Estimated Timeline:** 6-8 weeks  
**Complexity:** Medium-High  
**Priority:** High (widely used channel manager in Europe)

**Key Differences from Octorate:**
- Requires **partnership agreement** with D-Edge before API access
- Requires **certification process** after development
- Sandbox environment available for testing
- More formal integration process

---

## 1. D-Edge API Overview

### 1.1 D-Edge Developer Portal

**Resources:**
- Developer Portal: [https://developers.portal.d-edge.com](https://developers.portal.d-edge.com)
- API Documentation: [https://developers.portal.d-edge.com/apis](https://developers.portal.d-edge.com/apis)
- Get Started Guide: [https://developers.portal.d-edge.com/get-started](https://developers.portal.d-edge.com/get-started)

### 1.2 Integration Requirements

**Prerequisites:**
1. **Partnership Agreement**: Must establish formal partnership with D-Edge
2. **API Access**: Request API credentials through partnership
3. **Sandbox Environment**: Access to D-Edge sandbox for testing
4. **Certification**: Integration must pass D-Edge certification process

**Timeline:**
- Partnership setup: 1-2 weeks
- Development: 4-6 weeks
- Certification: 1-2 weeks
- **Total: 6-8 weeks**

---

## 2. Architecture Comparison: Octorate vs D-Edge

### 2.1 Similarities (Can Reuse Octorate Pattern)

Both integrations follow the same OTA pattern:
- **PULL** inventory, availability, rates FROM channel manager
- **PUSH** bookings TO channel manager
- **RECEIVE** booking confirmations via webhooks
- OAuth 2.0 authentication
- Per-hotel token management
- Read-only synced data in UI

### 2.2 Key Differences

| Aspect | Octorate | D-Edge |
|--------|----------|--------|
| **Partnership** | Direct API access | Requires partnership agreement |
| **Certification** | Not required | Required before production |
| **Sandbox** | Available | Available (via partnership) |
| **API Base URL** | `https://api.octorate.com` | TBD (from D-Edge docs) |
| **OAuth Flow** | Standard OAuth 2.0 | Standard OAuth 2.0 (likely) |
| **Rate Limits** | 100 calls/5min per accommodation | TBD (need to verify) |
| **Webhooks** | Yes (PORTAL_SUBSCRIPTION_CALENDAR) | Yes (need to verify events) |

---

## 3. Required Changes Overview

### 3.1 Database Schema Changes

Following the same pattern as Octorate, we'll create similar tables with `d_edge` prefix:

#### NEW TABLES TO CREATE:

1. **`d_edge_hotel_connections`** (NEW)
   - Store OAuth tokens for hotels connected via D-Edge
   - Link to `businesses` or `hotels`
   - Store D-Edge property ID (hotel's property in D-Edge)
   - Similar structure to `octorate_hotel_connections`

2. **`d_edge_room_mappings`** (NEW)
   - Map D-Edge room types TO our local `rooms` table
   - Store D-Edge room type IDs
   - Similar structure to `octorate_room_mappings`

3. **`d_edge_sync_queue`** (NEW)
   - Queue for async sync operations (pulling data, pushing bookings)
   - Similar structure to `octorate_sync_queue`

4. **`d_edge_webhook_events`** (NEW)
   - Store incoming webhook events from D-Edge
   - Similar structure to `octorate_webhook_events`

#### TABLES TO MODIFY:

1. **`hotels` / `businesses`** (MODIFY)
   - Add: `pms_type` - Extend to include 'd_edge' option
   - Add: `d_edge_connection_id` - Link to `d_edge_hotel_connections`

2. **`rooms`** (MODIFY)
   - Add: `d_edge_room_id` - External room ID from D-Edge
   - Add: `is_synced_from_d_edge` - Boolean flag
   - Add: `last_synced_from_d_edge_at` - Last sync timestamp

3. **`room_pricing`** (MODIFY)
   - Add: `is_synced_from_d_edge` - Boolean flag
   - Add: `last_synced_from_d_edge_at` - Track sync time

4. **`room_availability`** (MODIFY)
   - Add: `is_synced_from_d_edge` - Boolean flag
   - Add: `last_synced_from_d_edge_at` - Track sync time

5. **`reservations`** (MODIFY)
   - Add: `d_edge_booking_id` - Booking ID returned from D-Edge when we push
   - Add: `pushed_to_d_edge_at` - When we pushed booking to D-Edge
   - Add: `d_edge_push_status` - 'pending', 'pushed', 'confirmed', 'failed'
   - Add: `d_edge_confirmation_received_at` - When hotel confirmed via D-Edge

---

## 4. API Routes to Create

Following the same pattern as Octorate:

#### NEW API ROUTES:

1. **`/api/d-edge/oauth/authorize`** (GET)
   - Initiate OAuth flow for hotel
   - Redirect hotel owner to D-Edge authorization URL

2. **`/api/d-edge/oauth/callback`** (GET)
   - Handle OAuth 2.0 callback from D-Edge
   - Exchange authorization code for tokens
   - Store tokens securely

3. **`/api/d-edge/webhook`** (POST)
   - Receive webhooks from D-Edge
   - Handle availability/rate updates
   - Handle booking confirmations

4. **`/api/d-edge/sync/inventory`** (POST)
   - Pull hotels' properties and rooms FROM D-Edge
   - Create/update local `rooms` table

5. **`/api/d-edge/sync/availability`** (POST)
   - Pull availability FROM D-Edge
   - Update local `room_availability` table

6. **`/api/d-edge/sync/rates`** (POST)
   - Pull rates FROM D-Edge
   - Update local `room_pricing` table

7. **`/api/d-edge/bookings/push`** (POST)
   - **PUSH booking TO D-Edge** when guest books on our platform
   - Create booking in D-Edge
   - Store `d_edge_booking_id` in our reservation

8. **`/api/d-edge/bookings/status`** (GET)
   - Check booking status in D-Edge
   - Get confirmation from hotel

9. **`/api/d-edge/sync/status`** (GET)
   - Get sync status for a hotel
   - Last sync times, errors, queue status
   - Connection health check

10. **`/api/d-edge/disconnect`** (POST)
    - Disconnect hotel from D-Edge
    - Clean up connection data

---

## 5. Service Layer to Create

#### NEW SERVICE FILES:

1. **`lib/services/d-edge/`** (NEW DIRECTORY)
   ```
   /d-edge
     - client.ts           # Base API client with OAuth
     - auth.ts             # OAuth flow management
     - properties.ts       # Pull properties FROM D-Edge (similar to accommodations)
     - rooms.ts            # Pull room types FROM D-Edge
     - availability.ts     # Pull availability FROM D-Edge
     - rates.ts            # Pull rates FROM D-Edge
     - bookings.ts         # PUSH bookings TO D-Edge
     - webhooks.ts         # Process webhooks FROM D-Edge
     - types.ts            # TypeScript types
     - queue.ts            # Sync queue management
     - encryption.ts       # Token encryption (reuse from Octorate)
   ```

2. **`lib/services/d-edge/client.ts`** (NEW)
   - REST API client with automatic token refresh
   - Rate limiting (TBD - need to verify D-Edge limits)
   - Error handling and retry logic
   - Request/response logging
   - Per-hotel token management

3. **`lib/services/d-edge/auth.ts`** (NEW)
   - OAuth 2.0 flow implementation
   - Token storage per hotel (encrypted in database)
   - Token refresh logic per hotel
   - Authorization URL generation
   - Disconnect hotel from D-Edge

**Note**: Can reuse encryption utilities from Octorate implementation.

---

## 6. Components to Create/Modify

#### NEW COMPONENTS:

1. **`components/business/DEdgeConnection.tsx`** (NEW)
   - "Connect D-Edge Account" button/flow
   - OAuth connection UI for hotel owner
   - Show connection status
   - Disconnect option
   - Select which D-Edge property to connect

2. **`components/business/DEdgeSyncStatus.tsx`** (NEW)
   - Display sync status dashboard
   - Last sync times (inventory, rates, availability)
   - Error logs
   - Manual sync triggers (pull from D-Edge)
   - Queue status
   - Show which data is synced from D-Edge (read-only indicator)

#### COMPONENTS TO MODIFY:

1. **`components/business/HotelBasicInfo.tsx`** (MODIFY)
   - Extend "PMS Connection" section to include D-Edge option
   - Radio: "Use our PMS" vs "Connect Octorate" vs "Connect D-Edge"
   - If D-Edge: Show connection status and sync button

2. **`components/business/PricingCalendar.tsx`** (MODIFY)
   - **IF synced from D-Edge:** Show read-only indicator
   - **IF synced from D-Edge:** Disable editing, show "Managed in D-Edge"
   - Add "Refresh from D-Edge" button if connected

3. **`components/business/AvailabilityDashboard.tsx`** (MODIFY)
   - **IF synced from D-Edge:** Show read-only indicator
   - **IF synced from D-Edge:** Disable editing, show "Managed in D-Edge"
   - Add "Refresh from D-Edge" button if connected

4. **`components/business/BookingManagement.tsx`** (MODIFY)
   - Show D-Edge booking ID if booking was pushed
   - Show push status (pending, confirmed, failed)
   - Show "Pushed to D-Edge" timestamp

5. **`components/business/NewReservationModal.tsx`** (MODIFY)
   - **IF hotel uses D-Edge:** After creating reservation, **PUSH to D-Edge**
   - Show "Pushing to D-Edge..." status

6. **`components/hotels/BookingModal.tsx`** (MODIFY)
   - Check if hotel uses D-Edge
   - After booking submission, trigger push to D-Edge

---

## 7. Implementation Plan

### Phase 1: Partnership & Setup (Week 1-2)

**Tasks:**
1. Contact D-Edge to establish partnership
2. Request API access and credentials
3. Get access to sandbox environment
4. Review D-Edge API documentation in detail
5. Understand authentication flow
6. Understand API endpoints and data structures

**Deliverables:**
- Partnership agreement with D-Edge
- API credentials (client_id, client_secret)
- Sandbox access
- API documentation review notes

### Phase 2: Foundation & Authentication (Week 2-3)

**Tasks:**
1. Create database schema (similar to Octorate)
2. Build D-Edge API client library
3. Implement OAuth 2.0 authentication
4. Implement token refresh logic
5. Create admin UI for D-Edge connection setup

**Deliverables:**
- `migrations/XX_d_edge_integration_schema.sql`
- `lib/services/d-edge/client.ts`
- `lib/services/d-edge/auth.ts`
- `app/api/d-edge/oauth/authorize/route.ts`
- `app/api/d-edge/oauth/callback/route.ts`
- `components/business/DEdgeConnection.tsx`

### Phase 3: Inventory Pull & Mapping (Week 3-4)

**Tasks:**
1. Implement property/property list pull FROM D-Edge
2. Implement room types pull FROM D-Edge
3. Handle property/room mapping
4. Create/update local `rooms` table
5. Mark as synced from D-Edge

**Deliverables:**
- `lib/services/d-edge/properties.ts`
- `lib/services/d-edge/rooms.ts`
- `app/api/d-edge/sync/inventory/route.ts`
- Room mapping UI

### Phase 4: Pull Availability FROM D-Edge (Week 4-5)

**Tasks:**
1. Implement availability pull FROM D-Edge
2. Update local `room_availability` table
3. Mark as synced from D-Edge
4. Handle rate limits
5. Queue system for sync operations

**Deliverables:**
- `lib/services/d-edge/availability.ts`
- `app/api/d-edge/sync/availability/route.ts`
- Queue implementation
- UI updates for read-only availability

### Phase 5: Pull Rates FROM D-Edge (Week 5)

**Tasks:**
1. Implement rates pull FROM D-Edge
2. Update local `room_pricing` table
3. Mark as synced from D-Edge
4. Map D-Edge rate plans to our pricing structure

**Deliverables:**
- `lib/services/d-edge/rates.ts`
- `app/api/d-edge/sync/rates/route.ts`
- UI updates for read-only pricing

### Phase 6: Push Bookings TO D-Edge (Week 5-6)

**Tasks:**
1. Implement booking push TO D-Edge
2. Create booking in D-Edge via API
3. Store D-Edge booking ID
4. Handle push errors and retries
5. Update booking flow UI

**Deliverables:**
- `lib/services/d-edge/bookings.ts`
- `app/api/d-edge/bookings/push/route.ts`
- Booking flow integration
- Status tracking UI

### Phase 7: Webhooks FROM D-Edge (Week 6)

**Tasks:**
1. Implement webhook endpoint
2. Process availability/rate updates FROM D-Edge
3. Process booking confirmations FROM D-Edge
4. Update local data from webhooks
5. Log webhook events

**Deliverables:**
- `lib/services/d-edge/webhooks.ts`
- `app/api/d-edge/webhook/route.ts`
- Webhook processing logic

### Phase 8: Testing & Certification (Week 6-7)

**Tasks:**
1. Comprehensive testing in sandbox
2. End-to-end flow testing
3. Error handling testing
4. Load testing
5. Prepare for D-Edge certification
6. Submit integration for certification
7. Address certification feedback

**Deliverables:**
- Test results
- Certification submission
- Certification approval

### Phase 9: Production Deployment (Week 7-8)

**Tasks:**
1. Deploy to production
2. Monitor integration
3. Handle any production issues
4. User documentation
5. Admin guide

**Deliverables:**
- Production deployment
- Monitoring setup
- Documentation

---

## 8. Database Schema

### 8.1 Migration File Structure

```sql
-- Migration: XX_d_edge_integration_schema.sql

-- 1. D-Edge hotel connections table
CREATE TABLE IF NOT EXISTS d_edge_hotel_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- OAuth credentials (encrypted) - Each hotel has their own tokens
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT NOT NULL, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  
  -- D-Edge property ID (hotel's property in D-Edge)
  d_edge_property_id TEXT NOT NULL,
  
  -- Sync settings
  auto_sync_availability BOOLEAN DEFAULT true,
  auto_sync_rates BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60,
  
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

-- 2. Room mappings
CREATE TABLE IF NOT EXISTS d_edge_room_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  d_edge_connection_id UUID NOT NULL REFERENCES d_edge_hotel_connections(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  d_edge_room_id TEXT NOT NULL,
  
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(d_edge_connection_id, room_id),
  UNIQUE(d_edge_connection_id, d_edge_room_id)
);

-- 3. Sync queue
CREATE TABLE IF NOT EXISTS d_edge_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  d_edge_connection_id UUID NOT NULL REFERENCES d_edge_hotel_connections(id) ON DELETE CASCADE,
  
  sync_type TEXT NOT NULL CHECK (sync_type IN (
    'pull_inventory',
    'pull_availability',
    'pull_rates',
    'push_booking',
    'check_booking_status'
  )),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  entity_type TEXT,
  entity_id UUID,
  payload JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Webhook events log
CREATE TABLE IF NOT EXISTS d_edge_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  d_edge_connection_id UUID NOT NULL REFERENCES d_edge_hotel_connections(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 5. Modify hotels table
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS pms_type TEXT DEFAULT 'internal' 
  CHECK (pms_type IN ('internal', 'octorate', 'd_edge'));
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS d_edge_connection_id UUID REFERENCES d_edge_hotel_connections(id);

-- 6. Modify reservations table
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS d_edge_booking_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS pushed_to_d_edge_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS d_edge_push_status TEXT DEFAULT 'pending' 
  CHECK (d_edge_push_status IN ('pending', 'pushed', 'confirmed', 'failed', 'skipped'));
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS d_edge_confirmation_received_at TIMESTAMPTZ;

-- 7. Modify rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS d_edge_room_id TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_synced_from_d_edge BOOLEAN DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_synced_from_d_edge_at TIMESTAMPTZ;

-- 8. Modify room_pricing table
ALTER TABLE room_pricing ADD COLUMN IF NOT EXISTS is_synced_from_d_edge BOOLEAN DEFAULT false;
ALTER TABLE room_pricing ADD COLUMN IF NOT EXISTS last_synced_from_d_edge_at TIMESTAMPTZ;

-- 9. Modify room_availability table
ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS is_synced_from_d_edge BOOLEAN DEFAULT false;
ALTER TABLE room_availability ADD COLUMN IF NOT EXISTS last_synced_from_d_edge_at TIMESTAMPTZ;

-- Indexes and RLS policies (similar to Octorate)
-- ... (similar structure to Octorate migration)
```

---

## 9. Code Reusability Strategy

### 9.1 Shared Components

Since D-Edge and Octorate follow the same pattern, we can create shared components:

1. **`components/business/ChannelManagerConnection.tsx`** (NEW - Generic)
   - Generic connection component
   - Accepts `provider` prop ('octorate' | 'd_edge')
   - Reusable for both integrations

2. **`components/business/ChannelManagerSyncStatus.tsx`** (NEW - Generic)
   - Generic sync status component
   - Works with both Octorate and D-Edge

3. **Shared Types**
   - `types/channel-manager.ts` - Common types for channel manager integrations

### 9.2 Service Layer Pattern

Both integrations follow the same service layer pattern:
- `client.ts` - API client with OAuth
- `auth.ts` - OAuth flow
- `properties.ts` / `accommodations.ts` - Property/hotel data
- `rooms.ts` - Room types
- `availability.ts` - Availability data
- `rates.ts` - Pricing data
- `bookings.ts` - Booking push
- `webhooks.ts` - Webhook processing

### 9.3 Encryption Utilities

Reuse encryption utilities from Octorate:
- `lib/services/octorate/encryption.ts` → Move to `lib/services/channel-manager/encryption.ts`
- Use for both Octorate and D-Edge token encryption

---

## 10. Key Unknowns & Research Needed

### 10.1 API Details (Need from D-Edge Documentation)

1. **Base URL**: What is the D-Edge API base URL?
2. **OAuth Endpoints**: Authorization URL, token endpoint, refresh endpoint
3. **Authentication**: OAuth 2.0 flow details
4. **Rate Limits**: What are the API rate limits?
5. **Endpoints**:
   - Properties/Properties list endpoint
   - Room types endpoint
   - Availability endpoint
   - Rates endpoint
   - Booking creation endpoint
   - Booking status endpoint
6. **Webhooks**: What webhook events are available?
7. **Data Formats**: Request/response formats for each endpoint

### 10.2 Integration Process

1. **Partnership Requirements**: What are the exact requirements?
2. **Certification Process**: What are the certification criteria?
3. **Sandbox Access**: How to get sandbox credentials?
4. **Support**: How to contact D-Edge technical support?

---

## 11. Comparison: Octorate vs D-Edge Implementation

### 11.1 Similarities (Can Reuse ~70% of Code)

- Database schema structure (same pattern)
- OAuth 2.0 flow (standard implementation)
- Token management (same approach)
- Queue system (same structure)
- Webhook processing (same pattern)
- UI components (can be made generic)
- Error handling (same approach)

### 11.2 Differences (Need Custom Implementation)

- API endpoints (different URLs and structures)
- Data formats (may differ in field names)
- Rate limits (different limits)
- Webhook events (different event types)
- Property/room mapping (different IDs)

### 11.3 Estimated Effort Reduction

By reusing Octorate implementation:
- **Database schema**: 80% reusable (just rename tables/columns)
- **OAuth flow**: 90% reusable (just change endpoints)
- **Service layer**: 60% reusable (same pattern, different endpoints)
- **UI components**: 70% reusable (can make generic)
- **Overall**: ~65% code reuse possible

---

## 12. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Partnership delays | Medium | High | Start partnership process early |
| Certification issues | Medium | High | Follow D-Edge guidelines closely |
| API differences | Medium | Medium | Thorough API documentation review |
| Rate limit issues | Low | Medium | Implement proper queuing |
| Data format differences | Medium | Medium | Robust data mapping layer |

---

## 13. Success Metrics

### 13.1 Technical Metrics
- Sync success rate > 95%
- Average sync latency < 5 seconds
- Zero credential leaks
- Queue processing time < 1 minute

### 13.2 Business Metrics
- Number of hotels connected
- Reservations synced per day
- Reduction in manual work
- User satisfaction

---

## 14. Next Steps

### Immediate Actions:
1. [ ] Contact D-Edge to initiate partnership process
2. [ ] Request API documentation and credentials
3. [ ] Get access to sandbox environment
4. [ ] Review D-Edge API documentation in detail
5. [ ] Map D-Edge API endpoints to our requirements

### Before Development:
1. [ ] Confirm API endpoints and data formats
2. [ ] Understand OAuth flow details
3. [ ] Understand webhook events
4. [ ] Set up sandbox testing environment
5. [ ] Create detailed API integration spec

### Development:
1. [ ] Follow implementation plan phases
2. [ ] Reuse Octorate patterns where possible
3. [ ] Regular testing with D-Edge sandbox
4. [ ] Code reviews and documentation
5. [ ] Prepare for certification

---

## 15. Conclusion

Integrating D-Edge following the Octorate pattern is **highly feasible**. The architecture is similar, allowing for significant code reuse (~65%). The main differences are:

1. **Partnership requirement** - Must establish partnership first
2. **Certification process** - Must pass certification before production
3. **API specifics** - Different endpoints and data formats

**Estimated Timeline: 6-8 weeks**
- Partnership: 1-2 weeks
- Development: 4-5 weeks (with code reuse)
- Certification: 1-2 weeks

**Recommendation**: Proceed with D-Edge integration, leveraging the Octorate implementation as a template. Start by establishing the partnership and obtaining API documentation.

---

## References

- D-Edge Developer Portal: [https://developers.portal.d-edge.com](https://developers.portal.d-edge.com)
- D-Edge APIs: [https://developers.portal.d-edge.com/apis](https://developers.portal.d-edge.com/apis)
- D-Edge Get Started: [https://developers.portal.d-edge.com/get-started](https://developers.portal.d-edge.com/get-started)
- Octorate Integration Plan: `OCTORATE_INTEGRATION_PLAN.md`









