# 🚀 Testing Quick Start Guide

## Step 1: Install Dependencies

```bash
npm install
```

This will install all testing dependencies including:
- `vitest` - Test runner
- `@testing-library/react` - React testing utilities
- `@faker-js/faker` - Test data generation
- And more...

## Step 2: Run Your First Test

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with UI (visual test runner)
npm run test:ui

# Run tests once and exit
npm run test:run

# Generate coverage report
npm run test:coverage
```

## Step 3: Write Your First Test

### Example: Testing a Utility Function

Create `lib/utils.test.ts` (already created for you):

```typescript
import { describe, it, expect } from 'vitest';
import { formatPrice } from './utils';

describe('formatPrice', () => {
  it('should format price correctly', () => {
    expect(formatPrice(100)).toContain('100');
  });
});
```

### Example: Testing an API Route

Create `app/api/email/booking-confirmation/route.test.ts` (already created):

```typescript
import { describe, it, expect } from 'vitest';
import { POST } from './route';

describe('POST /api/email/booking-confirmation', () => {
  it('should return 400 if reservationId is missing', async () => {
    // Test implementation
  });
});
```

## Step 4: Test Structure

```
__tests__/
├── setup.ts              # Global test setup
├── mocks/
│   ├── supabase.ts      # Supabase mocks
│   └── factories.ts     # Test data factories
└── helpers/              # Test helper functions

app/
└── api/
    └── email/
        └── booking-confirmation/
            └── route.test.ts  # Tests next to code

lib/
└── utils.test.ts        # Tests next to code
```

## Step 5: Best Practices

### ✅ DO:
- Write tests for critical business logic first
- Test edge cases and error scenarios
- Use descriptive test names
- Keep tests isolated and independent
- Mock external dependencies (Supabase, APIs)

### ❌ DON'T:
- Test implementation details
- Write tests that depend on each other
- Use real API calls in tests
- Write tests that are too complex

## Step 6: Coverage Goals

- **Overall:** 70%+
- **Critical paths:** 90%+ (booking, auth, payments)
- **API routes:** 80%+
- **Utility functions:** 85%+

## Common Commands

```bash
# Run specific test file
npm test lib/utils.test.ts

# Run tests matching pattern
npm test -- -t "formatPrice"

# Run with coverage
npm run test:coverage

# Watch mode (auto-rerun on changes)
npm run test:watch
```

## Next Steps

1. ✅ Run `npm install` to install dependencies
2. ✅ Run `npm test` to see existing tests
3. ✅ Start writing tests for critical functions
4. ✅ Focus on API routes and business logic first
5. ✅ Aim for 70%+ coverage

## Need Help?

- Check `TESTING_IMPLEMENTATION_PLAN.md` for detailed strategy
- Review example tests in `lib/utils.test.ts`
- See API route test example in `app/api/email/booking-confirmation/route.test.ts`

