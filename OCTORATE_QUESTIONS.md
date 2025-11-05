# Questions for Octorate Support

This document contains questions that need to be answered by Octorate support to ensure our integration is correctly implemented.

**Last Updated**: [Date of last update]

---

## OAuth Flow Questions

### 1. Authorization URL - Backoffice Domain
**Question**: What is the exact value for `{{octorate user backoffice}}` in the authorization URL?
- Is it `admin.octorate.com` for all users?
- Or does it vary per user/region/tenant?
- **Current Implementation**: Using `admin.octorate.com` as default (based on example)

**Status**: ⏳ Pending confirmation

---

### 2. Token Exchange Endpoint ✅
**Question**: What is the exact URL for the token exchange endpoint (server-to-server call)?

**Answer (from documentation)**: 
- Endpoint format: `https://{{enviroment}}/rest/{version}/identity/token`
- **Current Implementation**: Using `https://{{backoffice}}/rest/v1/identity/token`
- Assumes `{{enviroment}}` is the same as `{{backoffice}}` URL

**Status**: ✅ Updated based on documentation

**Follow-up Questions**:
- What is the exact value for `{{enviroment}}`? Is it the same as backoffice URL?
- What is the API version (`{version}`)? Documentation shows `{version}` placeholder - is it `v1`, `v2`, or something else?
- **Current Implementation**: Using `v1` as default

**Context**: After the user grants permission, we receive a `code` parameter, and we need to exchange it for `access_token` and `refresh_token` via a server-to-server call. Must be done within 1 minute after redirect.

---

### 3. OAuth Query Parameters
**Question**: Are `response_type` and `scope` parameters needed in the authorization URL?
- Documentation only mentions: `client_id`, `redirect_uri`, `state`
- Should we include `response_type=code`?
- Should we include `scope` parameter? If yes, what are the valid scope values?

**Status**: ⏳ Pending confirmation

**Current Implementation**: Removed `response_type` and `scope` based on documentation, but want to confirm.

---

### 4. Token Refresh Endpoint
**Question**: Is the token refresh endpoint the same as the token exchange endpoint?
- Documentation shows token exchange endpoint format
- Should we use the same URL for refresh token?
- What `grant_type` should we use for refresh? (probably `refresh_token`)

**Status**: ⏳ Pending confirmation

**Current Implementation**: Using the same endpoint (`/rest/{version}/identity/token`) with `grant_type=refresh_token`.

---

## General API Questions

### 5. API Base URL
**Question**: What is the base URL for API calls (for accommodations, rooms, availability, rates, bookings)?
- Is it: `https://api.octorate.com`?
- Or: `https://{{backoffice}}/octobook/api`?
- Or different per endpoint?

**Status**: ⏳ Pending confirmation

---

### 6. Redirect URI Configuration ✅
**Question**: How do we register/whitelist redirect URIs?

**Answer (from documentation)**:
- Redirect URI can be changed later for production/sandbox environments
- Documentation mentions "API CONFIGURATION endpoint" - what is this endpoint?
- Can we register multiple redirect URIs per client_id?

**Status**: ✅ Basic understanding confirmed - Redirect URI is configurable

**Important Notes**:
- Redirect URI must be HTTPS (mandatory for security)
- Can be changed later for production/sandbox environments
- Must match exactly what's configured in Octorate

---

### 9. Admin Operations - ApiLogin Method ✅
**Question**: What is the ApiLogin method for admin operations?

**Answer (from documentation)**: 
- Endpoint: `/identity/apilogin`
- Method: POST with `client_id` and `client_secret` as form params
- Response: `access_token` and `expireDate` (no refresh_token)
- Use: Admin operations like creating properties (server-to-server, no user OAuth required)
- **Status**: ✅ Implemented

**Note**: As an OTA, we typically only pull data from Octorate, not create properties. This method may be needed if we need to perform admin operations on Octorate's side.

**Current Implementation**: Added `apiLogin()` function in `lib/services/octorate/auth.ts`

---

## Notes

- All questions are based on Octorate's OAuth documentation provided during integration setup
- Answers will be used to update implementation and documentation
- Questions will be marked as ✅ Answered once confirmed
- See `OCTORATE_DEVELOPMENT_GUIDELINES.md` for important development guidelines

---

### 7. Token Exchange Grant Type ✅
**Question**: What `grant_type` value should we use for token exchange?

**Answer (from documentation)**: 
- `grant_type=code` (not `authorization_code` as in standard OAuth 2.0)
- **Status**: ✅ Updated in implementation

---

### 8. Token Response Format ✅
**Question**: What is the format of the token response?

**Answer (from documentation)**:
- Response includes: `access_token`, `refresh_token`, `expireDate` (ISO string)
- **Note**: Uses `expireDate` (ISO date string) instead of `expires_in` (number in seconds)
- Example: `"expireDate": "2020-03-17T17:41:51.178Z"`
- **Status**: ✅ Updated in implementation

---

## Answers Log

### ✅ Answered Questions:
1. **Token Exchange Endpoint Format** (Question #2) - Updated to `/rest/{version}/identity/token`
2. **Grant Type** (Question #7) - Updated to `grant_type=code`
3. **Token Response Format** (Question #8) - Updated to use `expireDate` instead of `expires_in`
4. **Token Refresh Endpoint** (Question #4) - Updated to `/identity/refresh` (separate endpoint)
5. **Token Refresh Response** - Only includes `access_token` and `expireDate` (not `refresh_token`)
6. **Admin ApiLogin Method** (Question #9) - Implemented `/identity/apilogin` for admin operations

### ⏳ Pending Questions:
1. Backoffice URL confirmation
2. API version (`{version}`)
3. Environment URL (`{{enviroment}}`)
4. OAuth parameters (`response_type`, `scope`)
5. Token refresh request format (form params vs Bearer header)
6. API base URL
7. API CONFIGURATION endpoint for managing redirect URIs
8. How to register/change redirect URIs for production/sandbox

---

### 10. IP Authorization ✅
**Question**: What IP addresses should be whitelisted for Octorate webhook calls?

**Answer (from documentation)**:
- **Octorate IP addresses to whitelist**:
  - `94.177.193.204`
  - `5.189.168.114`

**Status**: ✅ Documented and implemented

**Implementation**:
- Added IP whitelisting to `/api/octorate/webhook` endpoint
- IP verification function checks X-Forwarded-For, X-Real-IP headers
- Returns 403 if IP is not whitelisted
- Note: May also need infrastructure-level whitelisting (firewall, Vercel Edge Config, etc.)

**Important**: 
- IP whitelisting should be configured at both application level (code) and infrastructure level
- Check your hosting provider's documentation for IP whitelisting options
- For Vercel: Consider using Edge Config or Middleware for IP filtering

---

## Testing/Sandbox Environment Notes

### First Stage Limitations ✅
**Information (from documentation)**:
- You will start with a **fake property** in the first stage
- In the first stage, you are **only allowed to make requests for that fake property**
- This is for testing/integration purposes before going live

**Status**: ✅ Noted - Important for testing phase

**Implementation Notes**:
- Our OAuth flow already handles user consent screen correctly ✅
- When user clicks "authorize this api user", we receive the callback ✅
- Redirect URI can be changed later for production/sandbox ✅

---

