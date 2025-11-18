# 📝 Structured Logging Implementation Plan

## 🎯 Goal
Replace all 349 `console.log/error` statements with structured logging using Pino.

---

## 📋 Implementation Strategy

### Phase 1: Infrastructure Setup ✅
- [x] Install Pino logging library
- [x] Create logger utility (`lib/logger.ts`)
- [x] Create health check endpoint
- [x] Configure log levels and formatting

### Phase 2: Replace Console Statements (Priority Order)

#### 🔴 **Critical Files First** (High Traffic, Production Impact)
1. **API Routes** - All `/app/api/**/route.ts` files
   - Email APIs (booking-confirmation, send-approval, omd-approved)
   - Contact form API
   - Admin APIs
   - Octorate webhooks
   - ~50 files

2. **Server-Side Utilities** - `lib/**/*.ts`
   - Supabase queries
   - Email services
   - Business logic
   - ~20 files

#### 🟡 **High Priority** (User-Facing)
3. **Server Components** - `app/**/page.tsx` (server components)
   - Admin pages
   - Business pages
   - ~15 files

#### 🟢 **Lower Priority** (Client-Side)
4. **Client Components** - `components/**/*.tsx`
   - These can keep console.log for now (browser console)
   - Or replace with logger that sends to API
   - ~30 files

---

## 🔄 Migration Pattern

### Before:
```typescript
console.log('User logged in:', userId);
console.error('Database error:', error);
```

### After:
```typescript
import logger from '@/lib/logger';

logger.info('User logged in', { userId });
logger.error('Database error', error, { table: 'users' });
```

---

## 📊 Progress Tracking

- **Total console statements:** 349
- **API Routes:** ~80 statements
- **Server Utilities:** ~60 statements
- **Server Components:** ~40 statements
- **Client Components:** ~169 statements (lower priority)

---

## ✅ Success Criteria

- [ ] All API routes use structured logging
- [ ] All server utilities use structured logging
- [ ] Health check endpoint working
- [ ] Log levels properly configured
- [ ] Sensitive data redacted
- [ ] Production-ready logging

---

## 🚀 Next Steps

1. Replace console statements in API routes
2. Replace console statements in server utilities
3. Test logging in development
4. Configure production log aggregation (optional)

