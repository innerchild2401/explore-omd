# Octorate Integration - Testing & Sandbox Notes

This document contains important information about testing and sandbox environment limitations.

---

## First Stage (Testing/Sandbox) Limitations

### Fake Property Restriction
- **You will start with a fake property** in the first stage
- **In the first stage, you are only allowed to make requests for that fake property**
- This is for testing/integration purposes before going live
- All API requests must be scoped to this fake property during initial testing

### Important Notes
- Do not attempt to make requests for other properties during testing
- All accommodations, rooms, availability, and rate requests must use the fake property ID
- Booking push requests must also use the fake property

---

## OAuth Flow - User Consent Screen

### Flow Description
1. **User initiates connection** from our platform (e.g., clicks "Connect Octorate" button)
2. **User is redirected** to Octorate's consent screen in their browser
   - Similar to Google OAuth consent screen
   - Similar to smartphone app permission screens ("AppName would like to connect to Octorate...")
3. **User clicks "authorize this api user"** button on Octorate's consent screen
4. **Octorate redirects back** to our callback URL with authorization code
5. **We exchange code for tokens** (server-to-server, within 1 minute)
6. **Connection is established** and we can make API requests

### Implementation Status
✅ **Already Implemented Correctly**
- Browser redirect to Octorate consent screen: `OctorateConnection.tsx`
- OAuth callback handler: `app/api/octorate/oauth/callback/route.ts`
- Token exchange: `lib/services/octorate/auth.ts`
- State parameter for security: Implemented with httpOnly cookies

---

## Redirect URI Configuration

### Important Notes
- **Redirect URI can be changed later** for production/sandbox environments
- Must be HTTPS (mandatory for security)
- Must match exactly what's configured in Octorate
- Can register different redirect URIs for different environments

### Current Setup
- **Development**: `http://localhost:3000/api/octorate/oauth/callback` (if running locally)
- **Production**: `https://your-domain.com/api/octorate/oauth/callback`
- **Sandbox**: `https://sandbox.your-domain.com/api/octorate/oauth/callback` (if needed)

### How to Change
- Contact Octorate support to update redirect URI in their system
- Update `OCTORATE_REDIRECT_URI` environment variable
- Ensure the new URI matches exactly what's configured in Octorate

---

## Testing Checklist

### Before Starting Testing
- [ ] Have fake property ID from Octorate
- [ ] Redirect URI configured in Octorate (sandbox/development)
- [ ] Client ID and Client Secret from Octorate
- [ ] Environment variables configured correctly
- [ ] Application restarted/redeployed with new environment variables

### During Testing
- [ ] Test OAuth flow with fake property
- [ ] Verify consent screen appears correctly
- [ ] Test token exchange (within 1 minute)
- [ ] Test API requests using fake property ID only
- [ ] Verify all requests are scoped to fake property
- [ ] Test token refresh functionality
- [ ] Test disconnect/reconnect flow

### After Testing
- [ ] Ready to move to production environment
- [ ] Update redirect URI for production
- [ ] Get production Client ID and Client Secret (if different)
- [ ] Test with real properties

---

## Common Issues

### Issue: Redirect URI Mismatch
**Symptom**: Error after user authorizes on consent screen
**Solution**: Ensure redirect URI in environment variables matches exactly what's configured in Octorate

### Issue: Token Exchange Timeout
**Symptom**: Token exchange fails after redirect
**Solution**: Ensure token exchange happens within 1 minute after redirect. Check server response time.

### Issue: Requests Fail for Property
**Symptom**: API requests return 403/404 for property
**Solution**: Verify you're using the fake property ID during testing. Ensure property ID is correct.

---

## Next Steps After Testing

1. **Complete testing** with fake property
2. **Contact Octorate** to move to production
3. **Update redirect URI** for production environment
4. **Test with real properties** (if multiple)
5. **Go live** with hotel connections

---

**Last Updated**: Based on Octorate documentation review
**Status**: Ready for testing phase

