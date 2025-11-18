# 🧪 Proposed Test Suite - Priority Order

## Overview
Based on the codebase audit, here are the **most critical tests** we should write first. These focus on:
1. **Business-critical functionality** (bookings, payments)
2. **Security** (authentication, authorization)
3. **Customer-facing features** (contact forms, emails)
4. **Data integrity** (database queries)

---

## 🔴 **PRIORITY 1: Critical Business Logic** (Must Have)

### 1.1 Database Query Functions (`lib/supabase/queries.ts`)
**Why:** Core data access layer - if these break, everything breaks
**Tests:**
- ✅ `getOMDBySlug()` - Find OMD by slug
- ✅ `getAllOMDs()` - List all OMDs
- ✅ `getSectionsByOMD()` - Get sections for OMD
- ✅ `getBusinessesByOMD()` - Get businesses
- ✅ Error handling (invalid slugs, missing data)
- ✅ Edge cases (empty results, null values)

**Estimated:** 15-20 tests

---

### 1.2 Booking/Reservation Utilities (`lib/utils.ts` - booking functions)
**Why:** Core booking calculations - financial impact if wrong
**Tests:**
- ✅ `calculateNights()` - Night calculation (already tested)
- ✅ Date validation functions
- ✅ Price calculations
- ✅ Availability checks

**Estimated:** 10-15 tests

---

## 🟡 **PRIORITY 2: API Routes** (High Priority)

### 2.1 Contact Form API (`app/api/contact/submit/route.ts`)
**Why:** Public endpoint, high traffic, security risk
**Tests:**
- ✅ Valid form submission
- ✅ Missing required fields
- ✅ Invalid email format
- ✅ SQL injection attempts (sanitization)
- ✅ XSS attempts (sanitization)
- ✅ Rate limiting (if implemented)
- ✅ Email sending success/failure

**Estimated:** 8-10 tests

---

### 2.2 Admin API Routes
**Why:** Security-critical, protected endpoints
**Tests:**
- ✅ `app/api/admin/active-omd/route.ts`
  - Authentication required
  - Authorization (only admins)
  - Valid OMD selection
  - Invalid OMD handling

**Estimated:** 6-8 tests

---

### 2.3 Email API Routes (Additional)
**Why:** Customer communication - already have booking-confirmation
**Tests:**
- ✅ `app/api/email/send-approval/route.ts`
- ✅ `app/api/email/omd-approved/route.ts`
- ✅ Error handling
- ✅ Missing environment variables

**Estimated:** 8-10 tests

---

## 🟢 **PRIORITY 3: Business Logic Functions** (Medium Priority)

### 3.1 Business Sorting (`lib/utils/business-sorting.ts`)
**Why:** Affects user experience, display order
**Tests:**
- ✅ Sort by name
- ✅ Sort by featured status
- ✅ Sort by rating
- ✅ Edge cases (empty arrays, null values)

**Estimated:** 6-8 tests

---

### 3.2 Email Sequence Services
**Why:** Automated customer communication
**Tests:**
- ✅ `lib/services/email-sequence/schedule.ts`
- ✅ `lib/services/email-sequence/tokens.ts`
- ✅ Token generation/validation
- ✅ Scheduling logic

**Estimated:** 10-12 tests

---

## 🔵 **PRIORITY 4: Integration Tests** (Lower Priority)

### 4.1 Octorate Integration
**Why:** External integration - test error handling
**Tests:**
- ✅ Webhook validation
- ✅ OAuth flow
- ✅ Error handling
- ✅ Retry logic

**Estimated:** 8-10 tests

---

## 📊 **Summary**

| Priority | Category | Tests | Estimated Time |
|----------|----------|-------|----------------|
| 🔴 P1 | Database Queries | 15-20 | 2-3 hours |
| 🔴 P1 | Booking Utils | 10-15 | 1-2 hours |
| 🟡 P2 | Contact API | 8-10 | 1 hour |
| 🟡 P2 | Admin API | 6-8 | 1 hour |
| 🟡 P2 | Email APIs | 8-10 | 1 hour |
| 🟢 P3 | Business Logic | 16-20 | 2 hours |
| 🔵 P4 | Integrations | 8-10 | 1-2 hours |
| **TOTAL** | | **71-93 tests** | **9-12 hours** |

---

## 🎯 **Recommended Starting Point**

### Phase 1: Start with Priority 1 (Today)
1. ✅ Database Query Functions (`lib/supabase/queries.test.ts`)
2. ✅ Any remaining booking utilities

**Why:** These are the foundation - everything else depends on them.

### Phase 2: Priority 2 (Next)
3. ✅ Contact Form API
4. ✅ Admin API Routes
5. ✅ Additional Email APIs

**Why:** Security and customer-facing features.

### Phase 3: Priority 3 & 4 (Later)
6. ✅ Business logic functions
7. ✅ Integration tests

**Why:** Important but less critical.

---

## ✅ **What I'll Create**

For each test file, I'll create:
- ✅ Complete test suite with all test cases
- ✅ Proper mocking (Supabase, external APIs)
- ✅ Edge case coverage
- ✅ Error scenario testing
- ✅ Clear test descriptions

---

## 🚀 **Ready to Start?**

**I recommend starting with:**
1. **Database Query Functions** (`lib/supabase/queries.test.ts`) - Most critical
2. **Contact Form API** (`app/api/contact/submit/route.test.ts`) - High traffic, security risk

**Should I proceed with these two first?**

