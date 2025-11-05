# Octorate Integration - Development Guidelines

This document contains important guidelines from Octorate for speeding up development and ensuring best practices.

---

## 📚 Resources & Documentation

### a) Starter Guide
**Location**: https://api.octorate.com/connect

**Action**: Read this carefully before starting development.

---

### b) Documentation Formats

**Two formats available:**

1. **Static Documentation**
   - Traditional documentation format
   - Reference material

2. **Dynamic Documentation** 
   - Interactive - you can try the API calls directly
   - **Bottom of dynamic docs**: Contains schemas of objects
   - **Use schemas to find**: Field descriptions and required fields
   - **Important**: Check schemas for complete field information

**Action**: Use dynamic documentation to test API calls and check schemas for field requirements.

---

### c) Showcases Section

**Location**: Check the showcases section in the documentation

**Purpose**: 
- Helpful to understand tricky parts of the integration
- Examples of how to implement specific features
- Real-world use cases

**Action**: Review showcases to understand complex integration patterns.

---

### d) OpenAPI Support

**What**: Octorate supports OpenAPI specification

**Usage**:
- Import the OpenAPI link from the documentation
- Use it to generate all requests in Postman
- Automated API client generation
- Better API exploration and testing

**Action**: Import OpenAPI spec into Postman for easier API testing and exploration.

**Benefits**:
- Pre-configured requests
- Auto-generated request/response schemas
- Easier testing and debugging

---

## 🧪 Testing & Development

### e) Test Accounts

**You will receive two accounts:**

1. **Customer Test Account**
   - Use to understand Octorate structure
   - Create rooms and rates
   - Work with the calendar
   - **Purpose**: Get familiar with how Octorate works from hotel perspective

2. **API Account**
   - Use for API integration testing
   - Make API calls
   - Test integration flows

**Action**: 
- Use customer test account to understand Octorate's structure
- Create test data (rooms, rates, calendar entries)
- Use API account for integration testing

---

## ⚠️ Important Implementation Notes

### f) HTTP Response Codes - CRITICAL

**⚠️ CRITICAL**: **Always give precedence to HTTP response codes**

**Why**: 
- HTTP response codes are what Octorate uses to tell you if everything went well
- Don't rely only on response body
- Response codes are the definitive status indicator

**Action**: 
- Always check HTTP status codes first
- Implement proper error handling based on status codes
- Handle all relevant HTTP status codes (200, 201, 400, 401, 403, 404, 429, 500, etc.)

**Example**:
```typescript
const response = await fetch(url, options);

// Check status code FIRST
if (!response.ok) {
  // Handle error based on status code
  if (response.status === 401) {
    // Token expired, refresh
  } else if (response.status === 429) {
    // Rate limit exceeded
  } else if (response.status === 400) {
    // Bad request - check response body for details
  }
  throw new Error(`API error: ${response.status}`);
}

// Only parse response if status is OK
const data = await response.json();
```

---

### g) Quota & Rate Limits

**Important**: **Quota is not infinite and is based on active properties**

**Implications**:
- You must optimize your API calls
- Don't make unnecessary requests
- Batch requests when possible
- Cache data when appropriate
- Only sync what's needed

**Optimization Strategies**:
1. **Cache responses**: Don't fetch the same data repeatedly
2. **Batch operations**: Combine multiple requests when possible
3. **Use webhooks**: Receive updates via webhooks instead of polling
4. **Incremental syncs**: Only sync changed data
5. **Smart polling**: Only poll when necessary (use webhooks as primary update mechanism)

**Our Implementation**:
- ✅ Webhook integration for real-time updates (reduces API calls)
- ✅ Rate limiting in client (100 calls/5min per accommodation)
- ⚠️ Need to optimize: Cache responses, batch requests, avoid unnecessary calls

**Action**: 
- Monitor API call usage
- Optimize sync frequency
- Use webhooks instead of polling
- Implement caching for frequently accessed data

---

## 📋 Development Checklist

### Before Starting Development:
- [ ] Read the starter guide: https://api.octorate.com/connect
- [ ] Review dynamic documentation (try API calls)
- [ ] Check schemas in dynamic docs for field requirements
- [ ] Review showcases section for tricky parts
- [ ] Import OpenAPI spec into Postman
- [ ] Get access to customer test account
- [ ] Get access to API account

### During Development:
- [ ] Always check HTTP response codes first
- [ ] Implement proper error handling based on status codes
- [ ] Optimize API calls (cache, batch, use webhooks)
- [ ] Monitor quota usage
- [ ] Test with customer test account first
- [ ] Use API account for integration testing

### After Development:
- [ ] Verify all HTTP status codes are handled correctly
- [ ] Optimize API call frequency
- [ ] Test quota limits
- [ ] Document API call patterns

---

## 🔗 Quick Links

- **Starter Guide**: https://api.octorate.com/connect
- **Dynamic Documentation**: (Check Octorate documentation for link)
- **Showcases**: (Check Octorate documentation for link)
- **OpenAPI**: (Check Octorate documentation for link)

---

## ⚠️ Key Takeaways

1. **Read the starter guide** - Essential foundation
2. **Use dynamic docs** - Check schemas for field requirements
3. **Review showcases** - Understand tricky parts
4. **Use OpenAPI** - Import into Postman for easier testing
5. **Use test accounts** - Customer account to understand structure, API account for testing
6. **HTTP response codes are critical** - Always check status codes first
7. **Optimize API calls** - Quota is limited, use webhooks and caching

---

**Last Updated**: Based on Octorate development guidelines
**Status**: Ready for development phase

