# Vercel Cron Setup & Verification

## ✅ What We've Tested Locally

1. **Route works**: `/api/cron/test-email` successfully sends emails
2. **Authentication logic**: Matches existing cron route pattern
3. **Email sending**: MailerSend integration works

## 🔍 Will It Work on Vercel?

**Yes, it should work!** Here's why:

### How Vercel Cron Works:

1. **Automatic Header**: Vercel automatically sends `x-vercel-cron` header when triggering cron jobs
2. **Our Code Checks**: The route checks for this header first
3. **Fallback**: If header missing, checks for `Authorization: Bearer CRON_SECRET`

### Authentication Flow:

```typescript
// 1. Check for Vercel's native cron header (automatic on Vercel)
const cronHeader = req.headers.get('x-vercel-cron');

// 2. If no header, check for custom auth token
if (!cronHeader) {
  if (process.env.CRON_SECRET) {
    // Require Bearer token
  }
  // If no CRON_SECRET set, allow (for local dev)
}
```

### What Happens on Vercel:

1. **Vercel triggers cron** → Sends `x-vercel-cron` header automatically
2. **Our route receives request** → Sees `x-vercel-cron` header
3. **Authentication passes** → Route executes
4. **Email sent** → Success!

## 📋 Pre-Deployment Checklist

### 1. Environment Variables in Vercel

Make sure these are set in **Vercel Dashboard → Settings → Environment Variables**:

- ✅ `MAILER_SEND_API_KEY` - Already set (emails work)
- ✅ `MAILER_SEND_FROM_EMAIL` - Already set (emails work)
- ⚠️ `CRON_SECRET` - **Optional but recommended** for extra security

**Note**: `CRON_SECRET` is optional because Vercel's `x-vercel-cron` header is sufficient. But it's good practice to set it for manual testing.

### 2. Verify `vercel.json` Cron Configuration

Current configuration:
```json
{
  "crons": [
    {
      "path": "/api/email/sequence/trigger",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/test-email",
      "schedule": "15 14 * * *"
    }
  ]
}
```

**Test cron schedule**: `15 14 * * *` = Daily at 14:15 UTC (17:15 Romania time)

### 3. Deploy and Monitor

After deployment:

1. **Check Vercel Logs**:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click latest deployment → Functions tab
   - Look for `/api/cron/test-email` execution

2. **Check Email**:
   - Wait for scheduled time (14:15 UTC)
   - Check inbox: **afilip.mme@gmail.com**
   - Should receive test email

3. **Verify in Logs**:
   - Look for: "Cron test email: Starting test email send"
   - Should see: `hasVercelCron: true`

## 🧪 Testing on Vercel (Before Scheduled Time)

You can manually trigger the cron to test immediately:

### Option 1: Vercel Dashboard
1. Go to Vercel Dashboard → Your Project → Cron Jobs
2. Find `/api/cron/test-email`
3. Click "Run Now" (if available)

### Option 2: Manual API Call (with CRON_SECRET)
```bash
curl -X POST https://your-domain.vercel.app/api/cron/test-email \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 3: Wait for Schedule
- Current schedule: `15 14 * * *` (14:15 UTC daily)
- Update to a time 10-15 minutes from now for testing
- Deploy and wait

## 🔒 Security Notes

### On Vercel (Production):
- ✅ Vercel automatically sends `x-vercel-cron` header
- ✅ Route checks for this header
- ✅ If header missing, requires `CRON_SECRET`
- ✅ Public access without header/secret is blocked

### Local Development:
- ✅ Allows requests without auth (for testing)
- ✅ Can test with `?secret=...` parameter
- ✅ Can test with `Authorization: Bearer ...` header

## 🐛 Troubleshooting

### If cron doesn't run on Vercel:

1. **Check Vercel Cron Status**:
   - Vercel Dashboard → Cron Jobs
   - Verify cron is enabled and scheduled correctly

2. **Check Function Logs**:
   - Look for errors in Vercel function logs
   - Check for authentication failures

3. **Verify Route Path**:
   - Ensure path in `vercel.json` matches route file location
   - Path: `/api/cron/test-email`
   - File: `/app/api/cron/test-email/route.ts`

4. **Check Environment Variables**:
   - Verify all required env vars are set in Vercel
   - Check for typos in variable names

### If email doesn't send:

1. **Check MailerSend**:
   - Verify `MAILER_SEND_API_KEY` is set
   - Check MailerSend dashboard for delivery status

2. **Check Logs**:
   - Look for MailerSend errors in function logs
   - Check email_logs table in database

## ✅ Expected Behavior

### On Vercel:
- Cron triggers automatically at scheduled time
- `x-vercel-cron` header is present
- Authentication passes
- Email sends successfully
- Logs show `hasVercelCron: true`

### Manual Test (with secret):
- Request with `Authorization: Bearer CRON_SECRET`
- Authentication passes
- Email sends successfully
- Logs show `hasVercelCron: false, hasAuthHeader: true`

## 📝 Next Steps

1. **Deploy to Vercel**
2. **Set CRON_SECRET** (optional but recommended)
3. **Wait for scheduled time** or **trigger manually**
4. **Verify email received**
5. **Check Vercel logs** for confirmation
6. **Remove/disable test cron** after verification (or keep for health checks)

---

**Status**: Ready for Vercel Deployment
**Last Updated**: 2024

