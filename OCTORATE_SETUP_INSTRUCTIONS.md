# Octorate Integration Setup Instructions

## Overview
This guide will help you set up the Octorate channel manager integration for your hotel. When connected, your inventory, availability, and rates will be synced from Octorate and displayed on this platform. Bookings made on this platform will be pushed to Octorate.

## Prerequisites
- An active Octorate account
- API credentials from Octorate (Client ID and Client Secret)
- Admin access to your hotel's settings on this platform

## Step 1: Obtain Octorate API Credentials

1. **Log in to Octorate Dashboard**
   - Go to https://www.octorate.com/
   - Log in with your Octorate account credentials

2. **Navigate to API Settings**
   - Go to **Settings** → **Integrations** → **API Access**
   - Or go to **Developer** → **API Credentials** (exact path may vary)

3. **Create OAuth Application**
   - Click **"Create New Application"** or **"Add Integration"**
   - Enter the following details:
     - **Application Name**: `Your Hotel Name - OTA Integration`
     - **Redirect URI**: `https://your-domain.com/api/octorate/oauth/callback`
       - Replace `your-domain.com` with your actual domain
     - **Scopes/Permissions**: Select the following:
       - `read_accommodations` - Read hotel information
       - `read_rooms` - Read room types
       - `read_availability` - Read availability
       - `read_rates` - Read pricing
       - `write_bookings` - Create bookings

4. **Save Credentials**
   - After creating the application, Octorate will provide:
     - **Client ID** (also called App ID or API Key)
     - **Client Secret** (also called Secret Key or API Secret)
   - **IMPORTANT**: Save these credentials securely. You'll need them in Step 2.

5. **Configure Webhook URL (Optional but Recommended)**
   - In Octorate, go to **Settings** → **Webhooks**
   - Add a new webhook with the URL: `https://your-domain.com/api/octorate/webhook`
   - Enable the following webhook events:
     - `PORTAL_SUBSCRIPTION_CALENDAR` - For availability/rate updates
     - `booking_confirmation` - For booking confirmations
     - `booking_cancellation` - For booking cancellations
   - Save the webhook secret (if provided) - you'll need it in Step 2

## Step 2: Configure Environment Variables

1. **Access Your Environment Configuration**
   - Contact your system administrator or developer
   - Provide them with the following credentials:

   ```
   OCTORATE_CLIENT_ID=your_client_id_here
   OCTORATE_CLIENT_SECRET=your_client_secret_here
   OCTORATE_API_BASE_URL=https://api.octorate.com
   OCTORATE_OAUTH_URL=https://api.octorate.com/oauth
   OCTORATE_REDIRECT_URI=https://your-domain.com/api/octorate/oauth/callback
   OCTORATE_WEBHOOK_SECRET=your_webhook_secret_here (if provided)
   OCTORATE_ENCRYPTION_KEY=generate_a_random_32_character_string
   ```

2. **Generate Encryption Key**
   - The encryption key should be a random 32-character string
   - You can generate one using: https://www.random.org/strings/
   - Or use: `openssl rand -hex 16`

3. **Update Environment File**
   - The administrator will add these to your `.env.local` file
   - Or configure them in your hosting platform's environment variables

## Step 3: Run Database Migration

1. **Access Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run Migration**
   - Copy the contents of `migrations/53_octorate_integration_schema.sql`
   - Paste into the SQL Editor
   - Click **Run** to execute the migration
   - Verify success (should see "Success. No rows returned" or similar)

## Step 4: Connect Your Hotel to Octorate

1. **Log in to Your Hotel Dashboard**
   - Go to your hotel's dashboard on this platform
   - Navigate to **Hotel Settings** → **Basic Information**

2. **Find Channel Manager Section**
   - Scroll to the **"Channel Manager Integration"** section
   - You'll see the Octorate connection panel

3. **Initiate Connection**
   - Click **"Connect Octorate"** button
   - You'll be redirected to Octorate's authorization page
   - Log in with your Octorate credentials (if not already logged in)
   - Review the permissions requested
   - Click **"Authorize"** or **"Allow"**

4. **Select Accommodation**
   - After authorization, you'll be redirected back
   - If you have multiple accommodations in Octorate, select the one to connect
   - Click **"Connect"**

5. **Verify Connection**
   - You should see a green "Connected to Octorate" status
   - The accommodation ID will be displayed

## Step 5: Initial Data Sync

1. **Sync Inventory**
   - In the **Sync Status** section, click **"Sync Inventory"**
   - This will pull room types from Octorate
   - Wait for the sync to complete (usually takes a few seconds)

2. **Sync Availability**
   - Click **"Sync Availability"**
   - This will pull availability for the next 30 days
   - You can sync more days by adjusting the date range in the API

3. **Sync Rates**
   - Click **"Sync Rates"**
   - This will pull pricing for the next 30 days
   - Make sure your rates are set up in Octorate

## Step 6: Verify Sync

1. **Check Rooms**
   - Go to **Rooms** section
   - Rooms synced from Octorate will show a "Synced from Octorate" badge
   - These rooms are read-only (cannot be edited here)

2. **Check Availability**
   - Go to **Availability** section
   - Availability should be displayed
   - Synced availability will show a read-only indicator

3. **Check Pricing**
   - Go to **Pricing** section
   - Pricing should be displayed
   - Synced pricing will show a read-only indicator with a message

## Troubleshooting

### Connection Issues
- **"Failed to connect"**: Check that your Client ID and Secret are correct
- **"Invalid redirect URI"**: Ensure the redirect URI in Octorate matches exactly
- **"Authorization failed"**: Make sure you're logged into the correct Octorate account

### Sync Issues
- **"No rooms found"**: Check that you have rooms configured in Octorate
- **"Rate limit exceeded"**: Wait 5 minutes and try again (limit: 100 calls per 5 minutes)
- **"Token expired"**: The system should auto-refresh, but try disconnecting and reconnecting

### Data Not Showing
- **"Empty availability"**: Make sure availability is set in Octorate
- **"No pricing"**: Check that rates are configured in Octorate
- **"Old data"**: Click "Sync" buttons to refresh data manually

### Webhook Issues
- **Webhooks not processing**: Check webhook URL is correct in Octorate
- **Missing updates**: Use manual sync buttons as fallback
- **Webhook errors**: Check the sync status dashboard for error messages

## Security Notes

- **Never share your Client Secret** with anyone
- **Encryption Key** should be kept secure and not shared
- **Webhook Secret** (if used) should be kept secure
- **Tokens are encrypted** in the database automatically
- **Disconnect** if you suspect unauthorized access

## Support

If you encounter issues:
1. Check the **Sync Status** dashboard for error messages
2. Review the error logs in your system
3. Contact support with:
   - Your hotel ID
   - Error message (if any)
   - Steps to reproduce
   - Screenshot of the issue

## Next Steps

After successful connection:
- Your data will sync automatically via webhooks
- Manual sync buttons are available for on-demand updates
- Bookings made on this platform will automatically push to Octorate
- Booking confirmations from Octorate will update reservations here

---

**Last Updated**: [Current Date]
**Version**: 1.0

