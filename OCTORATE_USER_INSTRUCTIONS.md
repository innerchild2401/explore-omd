# Octorate Integration - User Instructions

## Overview
This guide explains how to connect your Octorate PMS account to the platform. When connected, your hotel's inventory, availability, and rates will automatically sync from Octorate, and bookings made on this platform will be pushed to Octorate.

## Prerequisites
- An active Octorate account
- Admin access to your hotel's dashboard on this platform
- API credentials from Octorate (see "Getting API Credentials" below)

---

## Step 1: Get Octorate API Credentials

### 1.1 Log in to Octorate
1. Go to https://www.octorate.com/
2. Log in with your Octorate account credentials

### 1.2 Navigate to API Settings
1. In your Octorate dashboard, go to **Settings** → **Integrations** → **API Access**
   - *Note: The exact path may vary depending on your Octorate version. Look for "API", "Integrations", or "Developer" settings.*

### 1.3 Create OAuth Application
1. Click **"Create New Application"** or **"Add Integration"**
2. Fill in the application details:
   - **Application Name**: `[Your Hotel Name] - OTA Integration`
   - **Redirect URI**: `https://your-domain.com/api/octorate/oauth/callback`
     - *Replace `your-domain.com` with your actual domain*
     - *Example: `https://explore-omd.com/api/octorate/oauth/callback`*
   - **Scopes/Permissions**: Select all of the following:
     - ✅ `read_accommodations` - Read hotel information
     - ✅ `read_rooms` - Read room types
     - ✅ `read_availability` - Read availability
     - ✅ `read_rates` - Read pricing
     - ✅ `write_bookings` - Create bookings

3. Click **"Save"** or **"Create Application"**

### 1.4 Save Your Credentials
After creating the application, Octorate will display:
- **Client ID** (also called App ID, API Key, or Consumer Key)
- **Client Secret** (also called Secret Key, API Secret, or Consumer Secret)

**⚠️ IMPORTANT:** 
- Copy these credentials immediately - the Client Secret may only be shown once
- Store them securely - you'll need them in Step 2
- Never share these credentials publicly

### 1.5 (Optional) Configure Webhook URL
For real-time updates, configure webhooks in Octorate:
1. Go to **Settings** → **Webhooks** in Octorate
2. Add a new webhook with URL: `https://your-domain.com/api/octorate/webhook`
3. Enable these webhook events:
   - ✅ `PORTAL_SUBSCRIPTION_CALENDAR` - For availability/rate updates
   - ✅ `booking_confirmation` - For booking confirmations
   - ✅ `booking_cancellation` - For booking cancellations
4. Save the **Webhook Secret** (if provided) - you'll need it in Step 2

---

## Step 2: Provide Credentials to System Administrator

Contact your system administrator or developer and provide them with the following information:

### Required Information:
```
OCTORATE_CLIENT_ID=your_client_id_here
OCTORATE_CLIENT_SECRET=your_client_secret_here
OCTORATE_API_BASE_URL=https://api.octorate.com
OCTORATE_OAUTH_URL=https://api.octorate.com/oauth
OCTORATE_REDIRECT_URI=https://your-domain.com/api/octorate/oauth/callback
OCTORATE_WEBHOOK_SECRET=your_webhook_secret_here (if you configured webhooks)
OCTORATE_ENCRYPTION_KEY=generate_a_random_32_character_string
```

**Notes:**
- Replace `your-domain.com` with your actual domain
- The `OCTORATE_ENCRYPTION_KEY` should be a random 32-character string (the administrator can generate this)
- The administrator will add these to your environment configuration

---

## Step 3: Run Database Migration (System Administrator)

**⚠️ This step must be done by your system administrator.**

The administrator needs to run the database migration in Supabase:

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `migrations/53_octorate_integration_schema.sql`
3. Paste and run the SQL script
4. Verify success (should see "Success. No rows returned" or similar)

---

## Step 4: Connect Your Hotel to Octorate

### 4.1 Access Hotel Settings
1. Log in to your hotel dashboard on this platform
2. Navigate to **Hotel Settings** → **Basic Information**
3. Scroll to the **"Channel Manager Integration"** section

### 4.2 Initiate Connection
1. Click the **"Connect Octorate"** button
2. You'll be redirected to Octorate's authorization page
3. If not already logged in, log in with your Octorate credentials
4. Review the permissions being requested
5. Click **"Authorize"** or **"Allow"**

### 4.3 Select Accommodation (if applicable)
- If you have multiple accommodations in Octorate, you'll be prompted to select which one to connect
- Select the accommodation that corresponds to your hotel
- Click **"Connect"**

### 4.4 Verify Connection
- You should see a green **"Connected to Octorate"** status
- The accommodation ID will be displayed
- The sync status section will appear below

---

## Step 5: Initial Data Sync

After connecting, perform an initial sync of your data:

### 5.1 Sync Inventory
1. In the **Sync Status** section, click **"Sync Inventory"**
2. This will pull all room types from Octorate
3. Wait for the sync to complete (usually takes a few seconds)
4. Your rooms should now appear in the **Rooms** section

### 5.2 Sync Availability
1. Click **"Sync Availability"**
2. This will pull availability for the next 30 days
3. Wait for the sync to complete
4. Availability should now be visible in the **Availability** section

### 5.3 Sync Rates
1. Click **"Sync Rates"**
2. This will pull pricing for the next 30 days
3. Wait for the sync to complete
4. Rates should now be visible in the **Pricing** section

---

## Step 6: Verify Everything Works

### 6.1 Check Rooms
1. Go to the **Rooms** section
2. Rooms synced from Octorate will show a **"🔒 Synced from Octorate"** badge
3. These rooms are **read-only** (cannot be edited here)

### 6.2 Check Availability
1. Go to the **Availability** section
2. Availability should be displayed
3. Synced availability will show a **read-only indicator**
4. You'll see a message: **"Read-only: Availability synced from Octorate"**

### 6.3 Check Pricing
1. Go to the **Pricing** section
2. Pricing should be displayed
3. Synced pricing will show a **read-only indicator** with the message: **"Read-only: Pricing synced from Octorate"**
4. You cannot edit pricing here - manage it in Octorate

### 6.4 Test Booking Push
1. Create a test reservation through the booking form
2. The reservation should automatically push to Octorate
3. Check the reservation details to see the Octorate booking ID
4. The push status should show as **"Pushed"** or **"Confirmed"**

---

## How It Works

### Data Flow (FROM Octorate → This Platform)
- **Inventory**: Your room types sync from Octorate
- **Availability**: Real-time availability updates via webhooks (or manual sync)
- **Rates**: Pricing updates via webhooks (or manual sync)
- **All synced data is READ-ONLY** in this platform - you manage it in Octorate

### Booking Flow (TO Octorate ← This Platform)
- When a guest books on this platform:
  1. Reservation is created locally
  2. Booking is automatically pushed to Octorate
  3. Octorate booking ID is stored
  4. When hotel confirms in Octorate, status updates here via webhook

### Visual Indicators
- **🔒 Read-only badges** on synced data
- **Green connection status** when connected
- **Sync status dashboard** showing last sync times
- **Push status** on bookings showing Octorate integration

---

## Troubleshooting

### Connection Issues

**Problem:** "Failed to connect"
- **Solution**: Verify Client ID and Secret are correct
- Check that the redirect URI in Octorate matches exactly

**Problem:** "Invalid redirect URI"
- **Solution**: Ensure the redirect URI in Octorate matches: `https://your-domain.com/api/octorate/oauth/callback`
- Check for trailing slashes or typos

**Problem:** "Authorization failed"
- **Solution**: Make sure you're logged into the correct Octorate account
- Check that the OAuth application is active in Octorate

### Sync Issues

**Problem:** "No rooms found"
- **Solution**: Verify rooms are configured in Octorate
- Make sure you selected the correct accommodation

**Problem:** "Rate limit exceeded"
- **Solution**: Wait 5 minutes and try again
- Limit: 100 API calls per 5 minutes per accommodation

**Problem:** "Token expired"
- **Solution**: The system should auto-refresh, but try disconnecting and reconnecting
- Check connection status in the dashboard

### Data Not Showing

**Problem:** "Empty availability"
- **Solution**: Ensure availability is set in Octorate
- Click "Sync Availability" to manually refresh

**Problem:** "No pricing"
- **Solution**: Check that rates are configured in Octorate
- Click "Sync Rates" to manually refresh

**Problem:** "Old data"
- **Solution**: Click the sync buttons to refresh data manually
- Webhooks should auto-update, but manual sync is available as fallback

### Webhook Issues

**Problem:** Webhooks not processing
- **Solution**: Verify webhook URL is correct in Octorate
- Check webhook secret matches (if configured)

**Problem:** Missing updates
- **Solution**: Use manual sync buttons as fallback
- Check sync status dashboard for errors

---

## Security Notes

- ✅ **Never share your Client Secret** with anyone except your system administrator
- ✅ **Encryption Key** should be kept secure (only administrators have access)
- ✅ **Webhook Secret** (if used) should be kept secure
- ✅ **Tokens are automatically encrypted** in the database
- ✅ **Disconnect immediately** if you suspect unauthorized access

---

## What Happens When Connected

### ✅ What You CAN Do:
- View all your Octorate data (rooms, availability, rates)
- Create bookings that push to Octorate
- View booking status and confirmations
- Manually sync data when needed

### ❌ What You CANNOT Do (when synced):
- Edit room information (manage in Octorate)
- Edit availability (manage in Octorate)
- Edit pricing (manage in Octorate)
- These features are disabled with clear indicators

### 🔄 Automatic Sync:
- **Webhooks**: Real-time updates when you change data in Octorate
- **Manual Sync**: Use sync buttons for on-demand updates
- **Booking Push**: Automatic when bookings are created
- **Booking Confirmations**: Automatic when hotel confirms in Octorate

---

## Support

If you encounter issues:

1. **Check the Sync Status dashboard** for error messages
2. **Review the connection status** in Hotel Settings
3. **Try disconnecting and reconnecting** if issues persist
4. **Contact support** with:
   - Your hotel ID
   - Error message (if any)
   - Steps to reproduce
   - Screenshot of the issue

---

## Quick Reference

| Task | Where to Go |
|------|-------------|
| Connect Octorate | Hotel Settings → Basic Information → Channel Manager Integration |
| View Sync Status | Hotel Settings → Basic Information → Sync Status section |
| Manual Sync | Click "Sync Inventory", "Sync Availability", or "Sync Rates" buttons |
| View Synced Rooms | Rooms section (look for "Synced from Octorate" badge) |
| View Synced Availability | Availability section (read-only indicator) |
| View Synced Pricing | Pricing section (read-only indicator) |
| Disconnect | Hotel Settings → Basic Information → Click "Disconnect" button |

---

**Last Updated**: [Current Date]  
**Version**: 1.0

