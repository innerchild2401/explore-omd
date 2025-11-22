# Vercel Cron Test Instructions

## Test Email Cron Job

A test cron job has been created to verify Vercel cron functionality.

### Files Created:
- `/app/api/cron/test-email/route.ts` - Test cron route
- Updated `vercel.json` with test cron schedule

### Email Recipient:
- **To**: afilip.mme@gmail.com
- **Subject**: "🧪 Vercel Cron Test - [timestamp]"

---

## Testing Methods

### Method 1: Manual Testing (Recommended First)

Test the route manually before deploying:

1. **Set CRON_SECRET in `.env.local`**:
   ```bash
   CRON_SECRET=your-secret-key-here
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   ```

3. **Test via GET request** (browser or curl):
   ```
   http://localhost:3000/api/cron/test-email?secret=your-secret-key-here
   ```

   Or use curl:
   ```bash
   curl "http://localhost:3000/api/cron/test-email?secret=your-secret-key-here"
   ```

4. **Check email** - You should receive the test email within a few seconds.

---

### Method 2: Deploy and Test with Vercel Cron

1. **Set CRON_SECRET in Vercel Dashboard**:
   - Go to your Vercel project → Settings → Environment Variables
   - Add `CRON_SECRET` with a secure random string
   - Deploy the changes

2. **Current Schedule** (in `vercel.json`):
   ```json
   {
     "path": "/api/cron/test-email",
     "schedule": "15 14 * * *"
   }
   ```
   - This runs at **14:15 UTC daily** (17:15 Romania time)
   - **Update this** to a time 10-15 minutes from now for testing

3. **To schedule for 10 minutes from now**:
   - Calculate current UTC time + 10 minutes
   - Update `vercel.json`:
   ```json
   {
     "path": "/api/cron/test-email",
     "schedule": "25 14 * * *"  // Example: 14:25 UTC
   }
   ```
   - Format: `minute hour * * *` (cron format)

4. **Deploy**:
   ```bash
   git add .
   git commit -m "Add cron test email"
   git push
   ```

5. **Wait for scheduled time** and check email.

---

### Method 3: Test Immediately After Deployment

1. **Update schedule to run in 10 minutes**:
   - Check current UTC time
   - Add 10 minutes
   - Update `vercel.json`:
   ```json
   {
     "path": "/api/cron/test-email",
     "schedule": "MM HH * * *"  // Replace MM and HH
   }
   ```

2. **Deploy and wait** - Email should arrive at scheduled time.

---

## Cron Schedule Format

Vercel uses standard cron format: `minute hour day month weekday`

Examples:
- `15 14 * * *` - Daily at 14:15 UTC
- `0 9 * * *` - Daily at 09:00 UTC
- `*/10 * * * *` - Every 10 minutes (not recommended for production)
- `30 16 * * *` - Daily at 16:30 UTC

**UTC Time Conversion**:
- Romania is UTC+3 (EET) or UTC+2 (EEST)
- To run at 17:00 Romania time (EET), use `0 14 * * *` (14:00 UTC)
- To run at 17:00 Romania time (EEST), use `0 15 * * *` (15:00 UTC)

---

## Verification

### Check Vercel Logs:
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment → Functions tab
3. Look for `/api/cron/test-email` execution logs
4. Should see: "Cron test email: Email sent successfully"

### Check Email:
- Check inbox for: **afilip.mme@gmail.com**
- Subject: "🧪 Vercel Cron Test - [timestamp]"
- Should arrive within 1-2 minutes of scheduled time

### Check Database:
- Email should be logged in `email_logs` table
- Status should be `sent`

---

## Troubleshooting

### Email Not Received:
1. **Check MailerSend configuration**:
   - Verify `MAILER_SEND_API_KEY` is set
   - Check MailerSend dashboard for delivery status
   - Check spam folder

2. **Check Vercel logs**:
   - Look for errors in function execution
   - Verify CRON_SECRET is set correctly

3. **Check cron schedule**:
   - Verify time is correct (UTC)
   - Wait for scheduled time (cron doesn't run immediately)

### Unauthorized Error:
- Verify `CRON_SECRET` is set in Vercel environment variables
- For manual testing, use `?secret=your-secret` in URL

### Route Not Found:
- Ensure file is at: `/app/api/cron/test-email/route.ts`
- Redeploy after creating the file

---

## After Testing

Once you confirm cron works:

1. **Remove or disable test cron**:
   - Remove from `vercel.json` or change schedule to a far future date
   - Or keep it for periodic health checks

2. **Implement real cron jobs**:
   - Auto-regenerate top pages
   - Scheduled email sequences
   - Maintenance tasks

---

## Security Notes

- `CRON_SECRET` should be a long, random string
- Never commit `CRON_SECRET` to git
- Only set in Vercel environment variables
- The route verifies the secret in production mode

---

**Status**: Ready for Testing
**Last Updated**: 2024

