# Octorate IP Whitelist Configuration

This document contains information about IP authorization for Octorate webhook endpoints.

---

## Octorate IP Addresses

The following IP addresses must be whitelisted to allow Octorate to call your webhook endpoints:

```
94.177.193.204
5.189.168.114
```

---

## Implementation

### Application-Level (Code)

✅ **Already Implemented** in `app/api/octorate/webhook/route.ts`

The webhook endpoint includes IP verification that:
- Checks the client IP from request headers (X-Forwarded-For, X-Real-IP)
- Verifies the IP is in the whitelist
- Returns 403 if IP is not whitelisted
- Allows all IPs in development mode (for testing)

### Infrastructure-Level (Required)

⚠️ **MUST ALSO BE CONFIGURED** at your hosting/infrastructure level:

#### Option 1: Vercel (Recommended)

If hosting on Vercel, configure IP restrictions:

1. **Using Vercel Edge Config or Middleware:**
   - Add IP whitelist check in `middleware.ts`
   - Or use Vercel Edge Config for IP management

2. **Using Vercel Firewall:**
   - Go to Vercel Dashboard → Settings → Firewall
   - Add IP allowlist rules for the Octorate IPs

#### Option 2: Other Hosting Providers

- **AWS/Cloudflare/Other**: Configure firewall rules to allow only these IPs
- **Nginx/Apache**: Add IP whitelist rules in server configuration
- **Cloudflare**: Use Cloudflare Firewall Rules to allow specific IPs

#### Option 3: Load Balancer/Firewall

If using a load balancer or external firewall:
- Add rules to allow traffic from Octorate IPs
- Configure to forward X-Forwarded-For headers correctly

---

## Testing

### Verify IP Whitelisting Works

1. **Test with authorized IP:**
   - Should allow requests from `94.177.193.204` and `5.189.168.114`
   - Should return 200 OK for valid webhook payloads

2. **Test with unauthorized IP:**
   - Should return 403 Forbidden for requests from other IPs
   - Check logs to see blocked IP attempts

### Development Mode

- IP whitelisting is **disabled in development** (allows all IPs)
- This allows local testing with webhook tools
- Production mode enforces IP whitelisting

---

## Security Notes

1. **Defense in Depth**: Use both application-level and infrastructure-level IP filtering
2. **Logging**: Log all blocked IP attempts for security monitoring
3. **Monitoring**: Set up alerts for repeated unauthorized access attempts
4. **Signature Verification**: Also implement webhook signature verification (when available from Octorate)

---

## Webhook Endpoint

The webhook endpoint that requires IP whitelisting:

```
POST https://destexplore.eu/api/octorate/webhook
```

This endpoint receives:
- Availability/rate updates from Octorate
- Booking confirmations
- Booking cancellations
- Other webhook events

---

## Checklist

- [ ] Application-level IP whitelisting implemented ✅
- [ ] Infrastructure-level IP whitelisting configured (firewall/hosting)
- [ ] Test webhook endpoint with authorized IPs
- [ ] Test webhook endpoint with unauthorized IPs (should be blocked)
- [ ] Monitor logs for IP authorization attempts
- [ ] Set up alerts for security events

---

## Updating IP Whitelist

If Octorate adds new IP addresses:

1. Update `OCTORATE_WHITELISTED_IPS` array in `app/api/octorate/webhook/route.ts`
2. Update infrastructure-level firewall rules
3. Test with new IPs
4. Update this documentation

---

**Last Updated**: Based on Octorate documentation
**Status**: Application-level implemented, infrastructure-level configuration required

