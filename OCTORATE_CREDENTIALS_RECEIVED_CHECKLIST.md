# Octorate Credentials Received - Next Steps Checklist

**Status**: ⏳ Waiting for credentials (Expected in 72 hours)

---

## ✅ What We've Completed

### Documentation & Planning
- ✅ OAuth flow implementation updated to match Octorate requirements
- ✅ Token exchange endpoint updated (`/rest/{version}/identity/token`)
- ✅ Token refresh endpoint updated (`/identity/refresh`)
- ✅ Admin ApiLogin method implemented (`/identity/apilogin`)
- ✅ IP whitelisting implemented for webhook endpoint
- ✅ HTTP response code handling prioritized
- ✅ All documentation created and updated
- ✅ Permissions identified (5 required permissions)

### Implementation
- ✅ OAuth authorization URL format corrected
- ✅ Token exchange with correct grant_type (`code`)
- ✅ Token response format updated (`expireDate` instead of `expires_in`)
- ✅ Bearer token authentication implemented
- ✅ Webhook endpoint with IP whitelisting
- ✅ Error handling with HTTP status codes prioritized

---

## 📋 When Credentials Arrive (72 Hours)

### Step 1: Receive Credentials

You should receive:
- ✅ **Client ID** (from welcome mail)
- ✅ **Client Secret** (from welcome mail)
- ✅ Access to **Customer Test Account** (to understand Octorate structure)
- ✅ Access to **API Account** (for integration testing)
- ✅ **Fake Property ID** (for first stage testing - only this property can be used initially)

---

### Step 2: Set Environment Variables

**Location**: `.env.local` file (or your hosting platform's environment variables)

**Add these variables:**

```env
# Octorate OAuth Credentials (from welcome mail)
OCTORATE_CLIENT_ID=<your_client_id_here>
OCTORATE_CLIENT_SECRET=<your_client_secret_here>

# Octorate API Configuration
OCTORATE_API_BASE_URL=https://api.octorate.com
OCTORATE_BACKOFFICE_URL=admin.octorate.com
OCTORATE_ENVIRONMENT=admin.octorate.com
OCTORATE_API_VERSION=v1

# Token endpoints
OCTORATE_TOKEN_ENDPOINT=https://admin.octorate.com/rest/v1/identity/token
OCTORATE_REFRESH_ENDPOINT=https://admin.octorate.com/rest/v1/identity/refresh
OCTORATE_API_LOGIN_ENDPOINT=https://admin.octorate.com/rest/v1/identity/apilogin

# Redirect URI (must match what you provided to Octorate)
OCTORATE_REDIRECT_URI=https://destexplore.eu/api/octorate/oauth/callback

# Webhook Secret (if provided by Octorate)
OCTORATE_WEBHOOK_SECRET=<if_provided>

# Encryption Key (generate a random 32-character string)
OCTORATE_ENCRYPTION_KEY=<generate_random_32_character_string>

# Application
NEXT_PUBLIC_SITE_URL=https://destexplore.eu
```

**Generate Encryption Key:**
```bash
# Option 1: Using openssl
openssl rand -hex 16

# Option 2: Visit https://www.random.org/strings/
# Generate 32-character random string
```

---

### Step 3: Verify Configuration with Octorate Support

**Questions to confirm with Octorate** (see `OCTORATE_QUESTIONS.md`):

1. **Backoffice URL**: Is `admin.octorate.com` correct for all users?
2. **API Version**: Is `v1` the correct API version, or is it different?
3. **Environment URL**: Is `{{enviroment}}` the same as backoffice URL?
4. **Token Refresh Request Format**: Should `refresh_token` be sent as form param or Bearer header?
5. **API Base URL**: What is the base URL for API calls (accommodations, rooms, availability, rates, bookings)?
6. **Webhook Secret**: Will you provide a webhook secret for signature verification?

---

### Step 4: Test with Customer Test Account

**Before testing integration:**
1. Log in to customer test account
2. Explore Octorate structure:
   - Create test rooms
   - Create test rates
   - Work with the calendar
   - Understand how properties are structured
3. Note the **Fake Property ID** you'll be using for testing

**Purpose**: Understand Octorate from hotel perspective before testing API integration

---

### Step 5: Test OAuth Flow

1. **Restart application** (to load new environment variables)
2. **Go to Hotel Dashboard** → Settings → Channel Manager Integration
3. **Click "Connect Octorate"**
4. **Verify**:
   - ✅ Redirects to Octorate consent screen
   - ✅ User sees "authorize this api user" button
   - ✅ After authorization, redirects back to our callback
   - ✅ Token exchange completes successfully
   - ✅ Connection saved in database
   - ✅ Green "Connected" status appears

---

### Step 6: Test API Calls (Using Fake Property Only)

**⚠️ IMPORTANT**: In first stage, you can ONLY make requests for the fake property provided.

**Test these endpoints:**
1. **Pull Accommodations**
   - Should return the fake property
   - Verify property data structure

2. **Pull Room Types**
   - Should return rooms for fake property
   - Verify room data structure matches schemas

3. **Pull Availability**
   - Test date range queries
   - Verify availability data structure

4. **Pull Rates**
   - Test date range queries
   - Verify rate data structure

5. **Push Booking**
   - Create test booking on our platform
   - Push to Octorate
   - Verify booking appears in Octorate

6. **Test Webhooks**
   - Verify webhook endpoint is accessible
   - Test IP whitelisting (should block unauthorized IPs)
   - Test webhook processing

---

### Step 7: Verify Implementation Against Documentation

**Review these resources:**
- ✅ Starter Guide: https://api.octorate.com/connect/
- ✅ Dynamic Documentation: Test API calls, check schemas
- ✅ Showcases: Review tricky parts
- ✅ OpenAPI: Import into Postman for testing

**Verify:**
- ✅ HTTP response codes are checked first
- ✅ Error handling works correctly
- ✅ Rate limiting is respected
- ✅ Quota optimization is implemented

---

### Step 8: Test Webhook Endpoint

**Provide webhook URL to Octorate:**
```
https://destexplore.eu/api/octorate/webhook
```

**Verify:**
- ✅ IP whitelisting is configured (both application and infrastructure level)
- ✅ Webhook endpoint receives events
- ✅ Webhook processing works correctly
- ✅ Events are logged in database

---

### Step 9: Optimize API Calls

**Per Octorate guidelines, quota is limited:**
- ✅ Use webhooks instead of polling
- ✅ Implement response caching
- ✅ Batch requests when possible
- ✅ Only sync changed data
- ✅ Monitor quota usage

---

### Step 10: Update Documentation

After testing, update:
- ✅ `OCTORATE_QUESTIONS.md` - Mark confirmed answers
- ✅ `OCTORATE_VERIFICATION_CHECKLIST.md` - Update verification status
- ✅ Note any differences from expected behavior
- ✅ Document any issues encountered

---

## 🔍 Troubleshooting

### Issue: OAuth redirect fails
- **Check**: Redirect URI matches exactly in Octorate config
- **Check**: Environment variable `OCTORATE_REDIRECT_URI` is set correctly
- **Check**: Application is using HTTPS

### Issue: Token exchange fails
- **Check**: Client ID and Client Secret are correct
- **Check**: Token exchange happens within 1 minute
- **Check**: Endpoint URL is correct
- **Check**: HTTP status code for error details

### Issue: API calls fail with 401
- **Check**: Token is valid and not expired
- **Check**: Token refresh is working
- **Check**: Bearer token is in Authorization header

### Issue: Webhook not receiving events
- **Check**: IP whitelisting is configured correctly
- **Check**: Webhook URL is registered in Octorate
- **Check**: Webhook endpoint is accessible (HTTPS)

---

## 📚 Reference Documents

- **Development Guidelines**: `OCTORATE_DEVELOPMENT_GUIDELINES.md`
- **Permissions**: `OCTORATE_PERMISSIONS_RECOMMENDATION.md`
- **Questions**: `OCTORATE_QUESTIONS.md`
- **Verification Checklist**: `OCTORATE_VERIFICATION_CHECKLIST.md`
- **Testing Notes**: `OCTORATE_TESTING_NOTES.md`
- **IP Whitelist**: `OCTORATE_IP_WHITELIST.md`
- **Setup Instructions**: `TODO_OCTORATE_SETUP.md`

---

## ⏰ Timeline

- **Now**: Form submitted, waiting for credentials
- **+72 hours**: Credentials expected
- **+72-96 hours**: Initial testing with fake property
- **After testing**: Move to production environment (if needed)

---

## ✅ Ready to Proceed

Once credentials arrive:
1. Set environment variables
2. Test OAuth flow
3. Test API calls (fake property only)
4. Verify webhook endpoint
5. Optimize API calls
6. Document findings

---

**Last Updated**: After form submission
**Status**: ⏳ Waiting for credentials (72 hours)

