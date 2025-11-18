# 🛡️ Rate Limiting Implementation

## ✅ **Implementation Complete!**

### **What We Built**

1. **Rate Limiting Infrastructure**
   - Created `lib/rate-limit.ts` - Core rate limiting utility
   - Created `lib/middleware/rate-limit.ts` - Next.js API route middleware
   - Supports Upstash Redis (production) and in-memory fallback (development)

2. **Pre-configured Rate Limiters**
   - `public` - 10 requests/minute (contact forms, public APIs)
   - `auth` - 5 requests/minute (authentication endpoints)
   - `admin` - 100 requests/minute (admin operations)
   - `email` - 20 requests/minute (email sending)
   - `webhook` - 100 requests/minute (external webhooks)
   - `feedback` - 10 requests/minute (feedback submissions)
   - `api` - 60 requests/minute (general API endpoints)

3. **Applied to All Critical Routes**
   - ✅ Contact form API
   - ✅ Email APIs (booking-confirmation, send-approval, omd-approved)
   - ✅ Admin APIs
   - ✅ Feedback APIs
   - ✅ Octorate webhooks
   - ✅ Channel manager APIs
   - ✅ Email sequence APIs
   - ✅ OMD listing API

---

## 📋 **Rate Limits by Endpoint Type**

| Endpoint Type | Limit | Window | Use Case |
|--------------|-------|--------|----------|
| **Public** | 10 | 1 minute | Contact forms, public submissions |
| **Auth** | 5 | 1 minute | Login, registration (stricter for security) |
| **Admin** | 100 | 1 minute | Admin dashboard operations |
| **Email** | 20 | 1 minute | Email sending endpoints |
| **Webhook** | 100 | 1 minute | External service webhooks |
| **Feedback** | 10 | 1 minute | Rating, issue reporting |
| **API** | 60 | 1 minute | General API endpoints |

---

## 🔧 **Configuration**

### **Environment Variables**

For production, configure Upstash Redis:

```env
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Without Upstash:**
- Falls back to in-memory store (development only)
- **Warning:** Not suitable for production (doesn't work across instances)

### **Setting Up Upstash (Recommended for Production)**

1. Create account at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy REST URL and token
4. Add to environment variables

---

## 📝 **Usage**

### **In API Routes**

```typescript
import { rateLimitCheck } from '@/lib/middleware/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await rateLimitCheck(request, 'public');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  
  // Your handler code...
}
```

### **Response Headers**

Rate limit information is included in response headers:

- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests in window
- `X-RateLimit-Reset` - Unix timestamp when limit resets
- `Retry-After` - Seconds to wait before retrying (429 responses)

### **Rate Limit Exceeded Response**

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

Status: `429 Too Many Requests`

---

## 🎯 **Identifier Strategy**

Rate limiting uses IP address as the identifier:
1. Checks `x-forwarded-for` header (Vercel, Cloudflare)
2. Falls back to `x-real-ip`
3. Falls back to `cf-connecting-ip` (Cloudflare)
4. Defaults to `'unknown'` if none available

---

## ✅ **Protected Endpoints**

### **Public Endpoints** (10/min)
- `/api/contact/submit`

### **Email Endpoints** (20/min)
- `/api/email/booking-confirmation`
- `/api/email/send-approval`
- `/api/email/omd-approved`
- `/api/email/sequence/schedule`

### **Admin Endpoints** (100/min)
- `/api/admin/active-omd` (POST, DELETE)

### **Feedback Endpoints** (10/min)
- `/api/feedback/reservation-staff-rating`
- `/api/feedback/booking-issue`
- `/api/feedback/destination-rating`
- `/api/feedback/verify-token`

### **Webhook Endpoints** (100/min)
- `/api/octorate/webhook`

### **API Endpoints** (60/min)
- `/api/omds`
- `/api/octorate/bookings/push`
- `/api/channel-manager/push`
- `/api/email/sequence/trigger`

---

## 🚀 **Next Steps (Optional)**

1. **Set up Upstash Redis** for production
2. **Monitor rate limit hits** - Add metrics/logging
3. **Adjust limits** based on usage patterns
4. **Add user-based rate limiting** (for authenticated users)
5. **Implement rate limit bypass** for trusted IPs/services

---

## 📊 **Benefits**

✅ **DDoS Protection** - Prevents overwhelming the API  
✅ **Abuse Prevention** - Limits spam and malicious requests  
✅ **Resource Protection** - Prevents excessive database/email usage  
✅ **Cost Control** - Limits external API calls (MailerSend, etc.)  
✅ **Production Ready** - Works with Vercel and serverless functions  

---

*Generated: January 2025*

