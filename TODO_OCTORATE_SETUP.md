# Octorate Integration Setup TODO

## ✅ Completed
- [x] Database migration (migration 53) - SQL executed in Supabase
- [x] Code implementation - All services, API routes, and UI components created

## ⏳ Pending (Waiting for Octorate Credentials)

### Step 1: Get Octorate API Credentials
**Status:** ⏳ Waiting for credentials from Octorate

1. **Log in to Octorate Dashboard**
   - Go to: https://www.octorate.com/
   - Log in with your Octorate account

2. **Navigate to API Settings**
   - Path: **Settings** → **Integrations** → **API Access**
   - *(Alternative paths: "Developer" → "API Credentials" or "Settings" → "API")*

3. **Create OAuth Application**
   - Click **"Create New Application"** or **"Add Integration"**
   - Fill in:
     - **Application Name**: `[Your Hotel Name] - OTA Integration`
     - **Redirect URI**: `https://your-domain.com/api/octorate/oauth/callback`
       - *Replace `your-domain.com` with your actual domain*
     - **Scopes**: Select all:
       - ✅ `read_accommodations`
       - ✅ `read_rooms`
       - ✅ `read_availability`
       - ✅ `read_rates`
       - ✅ `write_bookings`
   - Click **"Save"** or **"Create"**

4. **Save Credentials**
   - Copy **Client ID** (also called App ID, API Key)
   - Copy **Client Secret** (also called Secret Key, API Secret)
   - ⚠️ **IMPORTANT**: Client Secret may only be shown once - save it immediately!

5. **Configure Webhook (Optional but Recommended)**
   - Go to **Settings** → **Webhooks** in Octorate
   - Add webhook URL: `https://your-domain.com/api/octorate/webhook`
   - Enable events:
     - ✅ `PORTAL_SUBSCRIPTION_CALENDAR`
     - ✅ `booking_confirmation`
     - ✅ `booking_cancellation`
   - Save **Webhook Secret** (if provided)

---

### Step 2: Set Environment Variables
**Status:** ⏳ Waiting for Octorate credentials

**Location:** `.env.local` file (or your hosting platform's environment variables)

**Add these variables:**

```env
# Octorate OAuth Credentials (from Step 1)
OCTORATE_CLIENT_ID=your_client_id_here
OCTORATE_CLIENT_SECRET=your_client_secret_here

# Octorate API URLs (usually these defaults are correct)
OCTORATE_API_BASE_URL=https://api.octorate.com
OCTORATE_OAUTH_URL=https://api.octorate.com/oauth

# Redirect URI (must match what you set in Octorate)
OCTORATE_REDIRECT_URI=https://your-domain.com/api/octorate/oauth/callback
# Replace 'your-domain.com' with your actual domain

# Webhook Secret (if you configured webhooks in Step 1)
OCTORATE_WEBHOOK_SECRET=your_webhook_secret_here
# Leave empty if not using webhooks

# Encryption Key (generate a random 32-character string)
OCTORATE_ENCRYPTION_KEY=generate_random_32_character_string_here
# Generate using: https://www.random.org/strings/ (32 chars)
# Or: openssl rand -hex 16
```

**How to generate `OCTORATE_ENCRYPTION_KEY`:**
- Option 1: Visit https://www.random.org/strings/ and generate a 32-character random string
- Option 2: Run `openssl rand -hex 16` in terminal
- Option 3: Use any random string generator (32 characters)

**Important Notes:**
- Replace `your-domain.com` with your actual domain (e.g., `explore-omd.com`)
- The redirect URI must match EXACTLY what you set in Octorate
- Never commit `.env.local` to git (it should already be in `.gitignore`)

---

### Step 3: Restart Application
**Status:** ⏳ After adding environment variables

1. **If running locally:**
   - Stop the dev server (Ctrl+C)
   - Restart with: `npm run dev`

2. **If deployed:**
   - Redeploy the application to pick up new environment variables
   - Or restart the server/container

---

### Step 4: Test Connection
**Status:** ⏳ After environment variables are set

1. **Log in to Hotel Dashboard**
   - Go to your hotel's dashboard
   - Navigate to: **Hotel Settings** → **Basic Information**

2. **Find Channel Manager Section**
   - Scroll to **"Channel Manager Integration"** section
   - You should see the Octorate connection panel

3. **Connect Octorate**
   - Click **"Connect Octorate"** button
   - You'll be redirected to Octorate authorization page
   - Log in and authorize
   - You'll be redirected back

4. **Verify Connection**
   - Should see green **"Connected to Octorate"** status
   - Accommodation ID should be displayed

---

### Step 5: Initial Data Sync
**Status:** ⏳ After connection is established

1. **Sync Inventory**
   - Click **"Sync Inventory"** button
   - Wait for completion
   - Verify rooms appear in Rooms section

2. **Sync Availability**
   - Click **"Sync Availability"** button
   - Wait for completion
   - Verify availability shows in Availability section

3. **Sync Rates**
   - Click **"Sync Rates"** button
   - Wait for completion
   - Verify pricing shows in Pricing section

---

### Step 6: Verify Read-Only Indicators
**Status:** ⏳ After sync completes

1. **Check Rooms**
   - Go to **Rooms** section
   - Should see **"🔒 Synced from Octorate"** badges
   - Rooms should be read-only

2. **Check Availability**
   - Go to **Availability** section
   - Should see read-only indicator
   - Message: "Read-only: Availability synced from Octorate"

3. **Check Pricing**
   - Go to **Pricing** section
   - Should see read-only indicator
   - Message: "Read-only: Pricing synced from Octorate"

---

### Step 7: Test Booking Push
**Status:** ⏳ After sync is complete

1. **Create Test Booking**
   - Create a test reservation through the booking form
   - Complete the booking process

2. **Verify Push**
   - Check reservation details
   - Should see Octorate booking ID
   - Push status should show "Pushed" or "Confirmed"

3. **Check in Octorate**
   - Log in to Octorate
   - Verify the booking appears there
   - Confirm the booking in Octorate
   - Check that status updates here via webhook

---

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] Environment variables are set correctly
- [ ] Application restarted/redeployed
- [ ] Can connect to Octorate (green status)
- [ ] Inventory syncs successfully
- [ ] Availability syncs successfully
- [ ] Rates sync successfully
- [ ] Read-only indicators appear on synced data
- [ ] Bookings push to Octorate successfully
- [ ] Webhooks work (if configured)
- [ ] Manual sync buttons work
- [ ] Disconnect function works

---

## 📝 Notes

- **Domain**: Replace `your-domain.com` with your actual domain everywhere
- **Credentials**: Keep Client Secret secure - never share publicly
- **Webhooks**: Optional but recommended for real-time updates
- **Sync**: Manual sync buttons available as fallback if webhooks fail
- **Read-only**: Synced data cannot be edited here - manage in Octorate

---

## 📚 Reference Documents

- **User Instructions**: `OCTORATE_USER_INSTRUCTIONS.md` - Detailed step-by-step guide
- **Setup Instructions**: `OCTORATE_SETUP_INSTRUCTIONS.md` - Technical setup guide
- **Integration Plan**: `OCTORATE_INTEGRATION_PLAN.md` - Full implementation plan

---

## 🆘 If You Need Help

1. Check the Sync Status dashboard for error messages
2. Review connection status in Hotel Settings
3. Check browser console for errors
4. Verify environment variables are set correctly
5. Check that redirect URI matches exactly in Octorate
6. Try disconnecting and reconnecting

---

**Last Updated**: [Current Date]  
**Status**: Waiting for Octorate API Credentials

