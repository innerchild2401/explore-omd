# Manual Email Sequence Testing Guide

## 1. Check Reservation and Email Status

Run the SQL queries in `check_email_sequence_status.sql` in your Supabase SQL Editor to see:
- All reservations and their email sequence status
- Which emails are scheduled, sent, or failed
- Which emails are **DUE NOW** (should be sent but haven't been)

## 2. Manually Trigger the Email Endpoint

### Option A: Using Vercel Dashboard (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Cron Jobs**
3. Find the cron job with path `/api/email/sequence/trigger`
4. Click **"Run Now"** or **"Trigger"** button

### Option B: Using cURL (Local/Manual)

**For Production (Vercel):**
```bash
curl -X GET https://your-domain.vercel.app/api/email/sequence/trigger \
  -H "x-vercel-cron: 1"
```

**For Local Development:**
```bash
# Without CRON_SECRET (if not set in .env.local)
curl -X GET http://localhost:3000/api/email/sequence/trigger

# With CRON_SECRET (if set in .env.local)
curl -X GET http://localhost:3000/api/email/sequence/trigger \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Using POST method (also supported):**
```bash
curl -X POST https://your-domain.vercel.app/api/email/sequence/trigger \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option C: Using Browser/Postman
- GET request to: `https://your-domain.vercel.app/api/email/sequence/trigger`
- Headers:
  - `x-vercel-cron: 1` (if calling from non-Vercel source, you'll need the CRON_SECRET instead)
  - `Authorization: Bearer YOUR_CRON_SECRET` (if CRON_SECRET is set)

## 3. Check the Response

The endpoint returns JSON like:
```json
{
  "success": true,
  "processed": 5,
  "sent": 4,
  "failed": 1
}
```

Or if no emails to send:
```json
{
  "success": true,
  "message": "No emails to send",
  "processed": 0
}
```

## 4. Verify Emails Were Sent

After triggering, run the SQL query again to see:
- `status` changed from `'scheduled'` to `'sent'` or `'failed'`
- `sent_at` timestamp populated
- `error_message` populated if status is `'failed'`

## 5. Troubleshooting

### If no emails are scheduled:
1. Check if reservation status is `'confirmed'` or `'tentative'` (not `'cancelled'` or `'pending'`)
2. Verify that `scheduleEmailSequence()` was called when the reservation was created
3. Check if the reservation has valid `check_in_date` and `check_out_date`

### If emails are scheduled but not sending:
1. Check if `scheduled_at` is in the past (should be `<= NOW()`)
2. Verify the cron job is actually running (check Vercel logs)
3. Check for errors in Vercel function logs
4. Verify email service credentials (MailerSend) are configured

### If emails are failing:
1. Check `error_message` in `email_sequence_logs` table
2. Verify guest email is valid
3. Check MailerSend API credentials and limits
4. Review Vercel function logs for detailed error messages

## 6. Test Scheduling a New Email

If you want to test the scheduling function for a specific reservation:

```sql
-- First, get a reservation ID
SELECT id, confirmation_number, reservation_status, check_in_date 
FROM reservations 
ORDER BY created_at DESC 
LIMIT 1;
```

Then call the schedule endpoint (if you have one):
```bash
curl -X POST https://your-domain.vercel.app/api/email/sequence/schedule \
  -H "Content-Type: application/json" \
  -d '{"reservationId": "YOUR_RESERVATION_ID_HERE"}'
```

Or manually insert a test email in the database:
```sql
INSERT INTO email_sequence_logs (
  reservation_id,
  email_type,
  scheduled_at,
  status
)
VALUES (
  'YOUR_RESERVATION_ID_HERE',
  'post_booking_followup',
  NOW() - INTERVAL '1 minute', -- Set to past so it's due immediately
  'scheduled'
);
```

Then trigger the endpoint to process it.

