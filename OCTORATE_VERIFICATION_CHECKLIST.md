# Octorate API Implementation Verification Checklist

This document verifies our implementation against Octorate's official OTA API documentation to ensure everything is in place before going live.

## Resources to Check
- **Integration Central**: https://api.octorate.com/connect/
- **Quick Start Guide**: Step 0 in Integration Central ⚠️ **READ CAREFULLY**
- **Showcase & Guides**: Step 1 - OTA integration examples (check for tricky parts)
- **Dynamic Swagger**: Step 2a - Interactive API testing (check schemas at bottom for field descriptions)
- **Postman Collection**: Step 2b - Postman documentation
- **OpenAPI**: Import OpenAPI link to generate all requests in Postman
- **API Access Request**: Step 3 - Get client_id and client_secret

**Important**: See `OCTORATE_DEVELOPMENT_GUIDELINES.md` for development best practices

---

## 1. OAuth 2.0 Authentication Flow ✅

### ✅ Implementation Status (Updated based on Octorate docs)
- **File**: `lib/services/octorate/auth.ts`
- **Authorization URL**: `https://{{octorate user backoffice}}/octobook/identity/oauth.xhtml`
  - Currently using: `admin.octorate.com` as default (based on example)
  - Environment variable: `OCTORATE_BACKOFFICE_URL`
- **OAuth Flow**: User consent screen (browser redirect) ✅
  - User is redirected to Octorate consent screen
  - User clicks "authorize this api user" button
  - Octorate redirects back to our callback URL
- **Query Parameters**: Only `client_id`, `redirect_uri`, and `state` (as per Octorate docs)
  - Removed `response_type` and `scope` parameters (not mentioned in docs)
- **Token Endpoint**: `https://{{enviroment}}/rest/{version}/identity/token`
  - Current: `https://{{backoffice}}/rest/v1/identity/token`
  - Environment variables: `OCTORATE_ENVIRONMENT`, `OCTORATE_API_VERSION`, `OCTORATE_TOKEN_ENDPOINT`
- **Grant Type**: `code` (Octorate uses 'code' not 'authorization_code')
- **Content-Type**: `application/x-www-form-urlencoded` ✅
- **Form Parameters**: Using `URLSearchParams` for form-encoded data ✅
- **Token Response**: Uses `expireDate` (ISO string) instead of `expires_in` (number) ✅
- **Timeout**: Must be done within 1 minute after redirect ✅
- **API Requests**: Uses `Authorization: Bearer {{access_token}}` header ✅
- **Token Refresh**: 
  - Endpoint: `/identity/refresh` (separate from token exchange) ✅
  - Response: Only `access_token` and `expireDate` (not `refresh_token`) ✅
  - Request format: Using form params (may need confirmation) ⚠️
- **State Parameter**: ✅ Implemented correctly
  - Stored in httpOnly cookies for verification
  - Includes hotel_id and user_id (base64 encoded)
- **Admin Operations Flow (ApiLogin)**: ✅ Implemented
  - Endpoint: `/identity/apilogin`
  - Server-to-server authentication using `client_id` and `client_secret`
  - Response: `access_token` and `expireDate` (no refresh_token)
  - Note: As OTA, typically only used for admin operations if needed

### ⚠️ Verification Needed
1. **Confirm Backoffice URL**: Verify the exact value for `{{octorate user backoffice}}`
   - Current assumption: `admin.octorate.com` (based on example)
   - Question: Is it the same for all users or does it vary?
   - **See**: `OCTORATE_QUESTIONS.md` Question #1

2. **Confirm Token Endpoint**: ✅ Updated based on documentation
   - Endpoint format: `https://{{enviroment}}/rest/{version}/identity/token`
   - Current implementation: `https://{{backoffice}}/rest/v1/identity/token`
   - Questions: What is `{{enviroment}}`? What is the API version?
   - **See**: `OCTORATE_QUESTIONS.md` Question #2

3. **OAuth Parameters**: Confirm if `response_type` and `scope` are needed
   - Documentation only mentions: `client_id`, `redirect_uri`, `state`
   - Currently removed from implementation
   - **See**: `OCTORATE_QUESTIONS.md` Question #3

4. **Redirect URI**: ✅ Must be whitelisted in Octorate's API configuration
   - Current: `${NEXT_PUBLIC_SITE_URL}/api/octorate/oauth/callback`
   - Must be HTTPS (mandatory for security)
   - **Can be changed later** for production/sandbox environments ✅
   - User consent screen: User clicks "authorize this api user" button ✅
   - **See**: `OCTORATE_QUESTIONS.md` Question #6

5. **Token Refresh Request Format**: Confirm how to send refresh_token to `/identity/refresh`
   - Current: Using form params (`refresh_token` in body)
   - May need: Bearer header or other format
   - **See**: `OCTORATE_QUESTIONS.md` Question #4

---

## 2. Portal Connection (OTA Registration) ⚠️

### ⚠️ CRITICAL - This may be missing!

According to Octorate's documentation, OTAs need to:
1. **Register Portal Connection**: Create a portal connection for each property
2. **Get Portal ID**: Receive a unique portal ID after registration
3. **Use Portal ID**: Use this ID to establish connections

### ❓ Questions for Octorate Support
- Do we need to register a portal connection BEFORE hotels can connect?
- Is the portal ID different from the accommodation ID?
- Is this a one-time setup or per-hotel?
- Is this handled automatically via OAuth or requires separate API call?

### 🔍 Files to Check
- `lib/services/octorate/accommodations.ts` - May need to add portal registration
- `app/api/octorate/oauth/callback/route.ts` - May need portal ID handling

---

## 3. API Endpoints Verification

### 3.1 Accommodations Endpoint ✅

**Our Implementation:**
```typescript
GET /accommodations
```
**File**: `lib/services/octorate/accommodations.ts`

**⚠️ Verification Needed:**
- [ ] Confirm exact endpoint path (may be `/connect/accommodations` or `/api/v1/accommodations`)
- [ ] Verify response structure matches `OctorateAccommodation` type
- [ ] Check if pagination is required
- [ ] Verify authentication header format

---

### 3.2 Room Types Endpoint ✅

**Our Implementation:**
```typescript
GET /accommodations/{accommodationId}/room-types
```
**File**: `lib/services/octorate/rooms.ts`

**⚠️ Verification Needed:**
- [ ] Confirm exact endpoint path
- [ ] Verify `accommodationId` parameter name (may be `accommodation_id` or `id`)
- [ ] Check response structure matches `OctorateRoomType[]`
- [ ] Verify if `maxOccupancy` and `basePrice` are included in response

---

### 3.3 Availability Endpoint ✅

**Our Implementation:**
```typescript
GET /accommodations/{accommodationId}/availability?start_date={startDate}&end_date={endDate}
```
**File**: `lib/services/octorate/availability.ts`

**⚠️ Verification Needed:**
- [ ] Confirm exact endpoint path
- [ ] Verify query parameter names (`start_date` vs `startDate`)
- [ ] Check date format (YYYY-MM-DD vs ISO 8601)
- [ ] Verify response structure matches `OctorateAvailability[]`
- [ ] Check if `roomTypeId` is included in each availability record
- [ ] Verify if `quantity` or just `available` boolean is returned

---

### 3.4 Rates Endpoint ✅

**Our Implementation:**
```typescript
GET /accommodations/{accommodationId}/rates?start_date={startDate}&end_date={endDate}
```
**File**: `lib/services/octorate/rates.ts`

**⚠️ Verification Needed:**
- [ ] Confirm exact endpoint path
- [ ] Verify query parameter names
- [ ] Check date format
- [ ] Verify response structure matches `OctorateRate[]`
- [ ] Check if currency is included per rate or globally
- [ ] Verify if rate plans are included (we may need to handle multiple rate plans)

---

### 3.5 Push Booking Endpoint ✅

**Our Implementation:**
```typescript
POST /accommodations/{accommodationId}/bookings
```
**File**: `lib/services/octorate/bookings.ts`

**⚠️ Verification Needed:**
- [ ] Confirm exact endpoint path
- [ ] Verify request body structure matches `OctorateBookingRequest`
- [ ] Check if `guestInfo` structure is correct (may need nested structure)
- [ ] Verify required vs optional fields
- [ ] Check response structure matches `OctorateBookingResponse`
- [ ] Verify if `bookingId` and `confirmationNumber` are both returned
- [ ] Check if booking status is immediately available or pending

---

### 3.6 Booking Status Endpoint ✅

**Our Implementation:**
```typescript
GET /accommodations/{accommodationId}/bookings/{bookingId}
```
**File**: `lib/services/octorate/bookings.ts`

**⚠️ Verification Needed:**
- [ ] Confirm exact endpoint path
- [ ] Verify response structure
- [ ] Check what statuses are possible (confirmed, pending, tentative, cancelled, etc.)

---

## 4. Webhooks Verification ⚠️

### 4.1 Webhook Endpoint ✅

**Our Implementation:**
```typescript
POST /api/octorate/webhook
```
**File**: `app/api/octorate/webhook/route.ts`

**Webhook URL**: Must be provided to Octorate during setup
- Format: `${NEXT_PUBLIC_SITE_URL}/api/octorate/webhook`
- Example: `https://destexplore.eu/api/octorate/webhook`

### 4.2 IP Authorization ✅

**Octorate IP Addresses to Whitelist:**
- `94.177.193.204`
- `5.189.168.114`

**Implementation Status:**
- ✅ IP whitelisting added to webhook endpoint
- ✅ Checks X-Forwarded-For and X-Real-IP headers
- ✅ Returns 403 if IP is not whitelisted
- ⚠️ **Also configure at infrastructure level** (firewall, hosting provider settings)

**Important**: 
- Application-level IP check is implemented
- **ALSO configure IP whitelisting at infrastructure level**:
  - Vercel: Edge Config or Middleware
  - Other hosting: Firewall rules or IP restriction settings
  - Check your hosting provider's documentation

### 4.2 Webhook Event Types ✅

**Our Implementation Handles:**
- `PORTAL_SUBSCRIPTION_CALENDAR` - Availability/rate updates
- `booking_confirmation` - Booking confirmed by hotel
- `booking_cancellation` - Booking cancelled

**⚠️ Verification Needed:**
- [ ] Confirm exact event type names (may be different casing or naming)
- [ ] Verify webhook payload structure
- [ ] Check if `accommodationId` is in payload or header
- [ ] Verify signature verification method (if provided)
- [ ] Check if webhooks require subscription setup via API

### 4.3 Webhook Subscription ⚠️

**According to Octorate docs:**
- May need to subscribe to webhooks via API
- May need to specify which events to receive
- May need `CONTENT_PUSH` webhook for room type updates

**❓ Questions for Octorate:**
- Do we need to subscribe to webhooks via API call?
- How do we register our webhook URL?
- What is the exact format of `PORTAL_SUBSCRIPTION_CALENDAR` events?
- Do we need separate subscriptions for availability vs rates?

---

## 5. Rate Limiting & Quota ⚠️

**Our Implementation:**
- Rate limit: 100 calls per 5 minutes per accommodation
- In-memory tracking (needs improvement for production)
- ⚠️ **Quota optimization needed** (quota is limited and based on active properties)

**⚠️ CRITICAL**: Per Octorate guidelines, **quota is not infinite** and is based on active properties. Must optimize API calls.

**Optimization Strategies Needed:**
- [ ] Use webhooks instead of polling (reduces API calls)
- [ ] Implement response caching
- [ ] Batch requests when possible
- [ ] Only sync changed data (incremental syncs)
- [ ] Monitor quota usage

**⚠️ Verification Needed:**
- [ ] Confirm exact rate limit (100/5min per accommodation)
- [ ] Check if rate limit headers are included in responses
- [ ] Verify if different endpoints have different limits
- [ ] Check if we need to handle 429 responses with retry-after headers
- [ ] Understand quota limits based on active properties
- [ ] Implement quota monitoring

---

## 6. Error Handling ⚠️

**Our Implementation:**
- ✅ **HTTP response codes checked FIRST** (per Octorate guidelines)
- ✅ Token refresh on 401 errors
- ✅ Rate limit handling (429 status code)
- ✅ Error logging
- ✅ Proper error messages from response body

**⚠️ CRITICAL**: Per Octorate guidelines, **always give precedence to HTTP response codes** - they are the definitive status indicator.

**Implementation Details:**
- Status code checked before parsing response body
- 401: Token expired → Refresh token
- 429: Rate limit exceeded → Handle with retry-after header
- 400/403/404/500: Extract error details from response body

**⚠️ Verification Needed:**
- [ ] Get list of all possible error codes and meanings
- [ ] Verify error response structure for each status code
- [ ] Check if errors include retry information
- [ ] Test all error scenarios

---

## 7. Environment Variables Required ✅

### Required Variables:
```env
# API Configuration
OCTORATE_API_BASE_URL=https://api.octorate.com
OCTORATE_BACKOFFICE_URL=admin.octorate.com
OCTORATE_TOKEN_ENDPOINT=https://admin.octorate.com/octobook/identity/oauth/token

# OAuth Credentials
OCTORATE_CLIENT_ID=<from Octorate - in welcome mail>
OCTORATE_CLIENT_SECRET=<from Octorate - in welcome mail>
OCTORATE_REDIRECT_URI=<must match Octorate config - must be HTTPS>

# Security
OCTORATE_WEBHOOK_SECRET=<if provided by Octorate>
OCTORATE_ENCRYPTION_KEY=<for token encryption>

# Application
NEXT_PUBLIC_SITE_URL=<your site URL>
```

**⚠️ Verification Needed:**
- [ ] Confirm exact API base URL (see Question #5 in OCTORATE_QUESTIONS.md)
- [ ] Confirm exact backoffice URL (see Question #1 in OCTORATE_QUESTIONS.md)
- [ ] Confirm token endpoint URL (see Question #2 in OCTORATE_QUESTIONS.md)
- [ ] Get client_id and client_secret from Octorate (in welcome mail)
- [ ] Register redirect URI in Octorate API configuration (must be HTTPS)
- [ ] Get webhook secret (if available)

---

## 8. Data Mapping Verification ⚠️

### 8.1 Room Type Mapping ✅
- Maps `OctorateRoomType.id` → `rooms.octorate_room_id`
- Stores mapping in `octorate_room_mappings` table

**⚠️ Verification Needed:**
- [ ] Verify room type ID format (string, UUID, integer?)
- [ ] Check if room type names can contain special characters
- [ ] Verify maxOccupancy mapping

### 8.2 Availability Mapping ✅
- Maps `OctorateAvailability.roomTypeId` → local `room_id` via mapping table
- Converts `available` boolean to `availability_status`
- Maps `quantity` to `available_quantity`

**⚠️ Verification Needed:**
- [ ] Verify availability data structure
- [ ] Check if dates are in local timezone or UTC
- [ ] Verify how blocked dates are represented

### 8.3 Rate Mapping ✅
- Maps `OctorateRate.roomTypeId` → local `room_id`
- Maps `OctorateRate.price` → `room_pricing.price`
- Maps `OctorateRate.currency` → `room_pricing.currency`

**⚠️ Verification Needed:**
- [ ] Verify rate structure (may have multiple rate plans)
- [ ] Check if rates include taxes/fees or base only
- [ ] Verify currency code format (ISO 4217?)

### 8.4 Booking Mapping ✅
- Maps local reservation → `OctorateBookingRequest`
- Maps `OctorateBookingResponse.bookingId` → `reservations.octorate_booking_id`

**⚠️ Verification Needed:**
- [ ] Verify guest information structure
- [ ] Check if special requests are supported
- [ ] Verify date format for check-in/check-out
- [ ] Check if children/infants are required fields

---

## 9. Missing/Unclear Implementation Points ⚠️

### 9.1 Portal Connection Registration ⚠️
**Status**: Not implemented
**Action**: Confirm with Octorate if this is required before OAuth

### 9.2 Webhook Subscription Setup ⚠️
**Status**: Not implemented
**Action**: Check if webhooks need to be subscribed via API

### 9.3 Content Push Webhook ⚠️
**Status**: Not implemented
**Action**: May need to handle `CONTENT_PUSH` for room type updates

### 9.4 Rate Plans Handling ⚠️
**Status**: Basic implementation
**Action**: Verify if Octorate supports multiple rate plans per room type

### 9.5 Inventory Push (ARI External Products) ⚠️
**Status**: Not implemented
**Action**: According to docs, if we have existing products, we may need to push them to Octorate. Verify if this applies to us.

---

## 10. Testing Checklist

### Before Going Live:
- [ ] Test OAuth flow with Octorate sandbox
- [ ] Test all API endpoints with real/sandbox data
- [ ] Test webhook reception (may need webhook testing tool)
- [ ] Test token refresh flow
- [ ] Test rate limit handling
- [ ] Test error scenarios (invalid tokens, network errors, etc.)
- [ ] Test booking push and confirmation flow
- [ ] Test data synchronization accuracy

---

## 11. Action Items Before Contacting Octorate

### Questions to Ask Octorate Support:

1. **Portal Connection:**
   - Do we need to register a portal connection before hotels can connect via OAuth?
   - Is the portal ID different from accommodation ID?
   - How do we get/register the portal ID?

2. **OAuth:**
   - Confirm exact OAuth base URL
   - Confirm required scopes
   - Confirm redirect URI format

3. **API Endpoints:**
   - Confirm exact base URL (`https://api.octorate.com` or different?)
   - Confirm exact endpoint paths (with versioning?)
   - Confirm request/response formats

4. **Webhooks:**
   - How do we register our webhook URL?
   - Do we need to subscribe to events via API?
   - What are the exact event type names?
   - Do we need `CONTENT_PUSH` webhook for room updates?

5. **Rate Limits:**
   - Confirm exact rate limits
   - How are rate limits communicated in responses?
   - What happens when rate limit is exceeded?

6. **Booking Flow:**
   - What is the exact booking request structure?
   - How long does booking confirmation take?
   - Can bookings be cancelled via API?

7. **Data Formats:**
   - Date format (ISO 8601, YYYY-MM-DD, etc.)?
   - Timezone handling?
   - Currency code format?

---

## 12. Files That May Need Updates

### High Priority:
1. `lib/services/octorate/auth.ts` - OAuth URL, scopes
2. `lib/services/octorate/client.ts` - API base URL
3. `lib/services/octorate/accommodations.ts` - Portal connection?
4. `lib/services/octorate/webhooks.ts` - Webhook subscription?

### Medium Priority:
1. All service files - Endpoint paths, parameter names
2. `lib/services/octorate/types.ts` - Response structures
3. `app/api/octorate/webhook/route.ts` - Webhook signature verification

### Low Priority:
1. Error handling improvements
2. Rate limiting improvements (database-backed)
3. Retry logic enhancements

---

## Next Steps

1. **Contact Octorate Support** with the questions above
2. **Request API Credentials** (client_id, client_secret)
3. **Request Sandbox Access** for testing
4. **Get API Documentation** (Swagger, Postman collection)
5. **Update Implementation** based on official documentation
6. **Test Thoroughly** in sandbox environment
7. **Deploy** to production

---

## Notes

- All our implementation is based on standard OTA integration patterns
- We've implemented the core functionality but may need adjustments based on Octorate's exact API structure
- The portal connection step mentioned in Octorate docs needs clarification
- Webhook subscription may require additional API calls
- Most endpoints follow RESTful conventions, but exact paths need verification

---

**Last Updated**: Based on implementation review
**Next Review**: After receiving Octorate API credentials and documentation

