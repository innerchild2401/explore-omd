# 🧪 Testing Workflow - Local Development

## Quick Answer: **Test Locally First!**

You **DO NOT** need to build or push to test. Testing happens on your local machine during development.

---

## 🔄 Development Workflow

### 1. **Write Code** (Local)
```bash
# Make your changes
code lib/utils.ts
```

### 2. **Write Tests** (Local)
```bash
# Write tests for your code
code lib/utils.test.ts
```

### 3. **Run Tests Locally** (Local)
```bash
# Run tests to verify they pass
npm test

# Or in watch mode (auto-reruns on file changes)
npm run test:watch
```

### 4. **Fix Issues** (Local)
```bash
# If tests fail, fix the code or tests
# Repeat until all tests pass
```

### 5. **Commit & Push** (Only after tests pass)
```bash
# Once tests pass locally, commit and push
git add .
git commit -m "Add feature with tests"
git push
```

### 6. **CI/CD Runs Tests** (Automatic on push)
- GitHub Actions (or your CI/CD) automatically runs tests
- If tests fail in CI, you'll be notified
- Fix and push again

---

## 📋 Step-by-Step: Your First Test Run

### Step 1: Install Dependencies (One-time setup)
```bash
npm install
```

This installs all testing dependencies (Vitest, Testing Library, etc.)

### Step 2: Run Tests Locally
```bash
# Run all tests once
npm test

# Or run in watch mode (recommended during development)
npm run test:watch
```

**Watch mode** automatically reruns tests when you change files - perfect for development!

### Step 3: See Test Results
You'll see output like:
```
✓ lib/utils.test.ts (15)
  ✓ formatPrice (5)
    ✓ should format price with default currency
    ✓ should format price with custom currency
    ...
  
Test Files  1 passed (1)
     Tests  15 passed (15)
```

### Step 4: Write More Tests
Keep writing tests as you develop. Tests run instantly locally.

---

## 🎯 Recommended Development Workflow

### Option A: Test-Driven Development (TDD) - Recommended
```bash
1. Write test first (it will fail)
2. Write code to make test pass
3. Refactor if needed
4. Repeat
```

### Option B: Code First, Then Test
```bash
1. Write code
2. Write tests
3. Run tests
4. Fix any issues
5. Commit when all pass
```

---

## 🚀 Test Commands

### During Development (Use These)
```bash
# Watch mode - auto-reruns on file changes (BEST for development)
npm run test:watch

# Run specific test file
npm test lib/utils.test.ts

# Run tests matching pattern
npm test -- -t "formatPrice"
```

### Before Committing (Use These)
```bash
# Run all tests once (make sure everything passes)
npm run test:run

# Generate coverage report
npm run test:coverage
```

### Visual Test Runner (Optional)
```bash
# Opens browser UI for tests
npm run test:ui
```

---

## ✅ Pre-Commit Checklist

Before you commit and push:

- [ ] All tests pass locally (`npm run test:run`)
- [ ] No test failures
- [ ] Coverage meets goals (70%+)
- [ ] Code is working as expected

**Only push when tests pass!**

---

## 🔄 CI/CD Integration (Future Step)

Once you push, CI/CD will automatically:

1. **Run tests** on the server
2. **Check coverage** meets thresholds
3. **Fail the build** if tests fail
4. **Prevent deployment** if tests fail

This is a **safety net** - but you should test locally first!

---

## ❓ Common Questions

### Q: Do I need to build before testing?
**A:** No! Tests run directly on your source code. No build needed.

### Q: Do I need to push to test?
**A:** No! Test locally first. Push only after tests pass.

### Q: What if tests fail locally?
**A:** Fix the code or tests, then test again. Don't push until tests pass.

### Q: What if tests pass locally but fail in CI?
**A:** This can happen due to environment differences. Check:
- Environment variables
- Node version
- Dependencies

### Q: How often should I run tests?
**A:** 
- **During development:** Use `npm run test:watch` (runs automatically)
- **Before committing:** Run `npm run test:run` (make sure all pass)
- **Before pushing:** Run `npm run test:coverage` (check coverage)

---

## 🎯 Your Action Plan

### Right Now:
1. ✅ Run `npm install` (if you haven't already)
2. ✅ Run `npm test` to see existing tests
3. ✅ Try `npm run test:watch` for auto-rerun mode

### During Development:
- Keep `npm run test:watch` running in a terminal
- Write tests as you code
- Fix issues immediately

### Before Committing:
- Run `npm run test:run` to ensure all pass
- Check coverage with `npm run test:coverage`
- Only commit if everything passes

---

## 💡 Pro Tips

1. **Keep watch mode running** - It's your safety net
2. **Write tests first** - It helps you think about edge cases
3. **Test small units** - Easier to debug
4. **Don't skip tests** - They save time in the long run
5. **Fix failing tests immediately** - Don't let them accumulate

---

## 🚨 Remember

- ✅ **Test locally** - No build/push needed
- ✅ **Tests run fast** - Usually < 30 seconds
- ✅ **Watch mode** - Auto-reruns on changes
- ✅ **Test before commit** - Don't push broken code
- ✅ **CI/CD is backup** - Local testing is primary

**Start testing locally right now - no need to build or push!**

