# SEO Environment Variable Setup Guide

## What is `NEXT_PUBLIC_SITE_URL`?

`NEXT_PUBLIC_SITE_URL` is used by the SEO system to generate:
- **Absolute URLs** for structured data (Schema.org)
- **Canonical URLs** in metadata
- **Open Graph URLs** for social sharing
- **Sitemap URLs** in robots.txt

Without it, the system uses fallbacks, but setting it explicitly ensures perfect SEO.

---

## 🏠 Local Development (.env.local)

### Option 1: Don't Set It (Recommended for Dev)
You can **leave it unset** in development. The system will automatically use:
```
http://localhost:3000
```

### Option 2: Set It Explicitly
If you want to test with a specific domain (e.g., using a local domain like `explore-omd.local`):

Create or edit `.env.local` in your project root:

```env
# .env.local
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Note:** `.env.local` is already in `.gitignore`, so it won't be committed.

---

## 🚀 Production (Vercel)

### Step 1: Get Your Production Domain

Your production domain is likely one of:
- `https://destexplore.eu` (if that's your domain)
- `https://your-app.vercel.app` (Vercel default)
- `https://your-custom-domain.com` (if you have a custom domain)

### Step 2: Add to Vercel Environment Variables

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add:
   - **Name:** `NEXT_PUBLIC_SITE_URL`
   - **Value:** `https://your-actual-domain.com` (use your real domain)
   - **Environment:** Select all (Production, Preview, Development)
6. Click **Save**

### Step 3: Redeploy

After adding the variable, Vercel will automatically trigger a new deployment. If not:
1. Go to **Deployments**
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

---

## 📋 Quick Setup Checklist

### ✅ Local Development
- [ ] Optionally create `.env.local` with `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- [ ] Or leave it unset (will auto-use localhost:3000)

### ✅ Vercel Production
- [ ] Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- [ ] Add `NEXT_PUBLIC_SITE_URL` = `https://your-production-domain.com`
- [ ] Select all environments (Production, Preview, Development)
- [ ] Save and redeploy

---

## 🔍 How to Verify It's Working

### 1. Check in Code
The value is used in:
- `lib/seo/utils.ts` → `getBaseUrl()` function
- All structured data schemas
- All metadata generation

### 2. Test in Production
After deployment, check:
- View page source → Look for `<link rel="canonical">` tags
- Check structured data → URLs should use your production domain
- Test sitemap → `https://yourdomain.com/sitemap.xml`

### 3. Example Output

**Without `NEXT_PUBLIC_SITE_URL` set:**
```html
<link rel="canonical" href="https://destexplore.eu/constanta/hotels/grand-hotel" />
```

**With `NEXT_PUBLIC_SITE_URL=https://destexplore.eu` set:**
```html
<link rel="canonical" href="https://destexplore.eu/constanta/hotels/grand-hotel" />
```

(Same result, but explicit is better!)

---

## ⚠️ Important Notes

1. **Must be a full URL** (with `https://` or `http://`)
2. **No trailing slash** (e.g., `https://destexplore.eu` not `https://destexplore.eu/`)
3. **Use HTTPS in production** (required for SEO)
4. **Vercel Preview URLs** - If you want preview deployments to use preview URLs, you can set different values per environment in Vercel

---

## 🎯 Recommended Values

### Development
```env
# .env.local (optional)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Production (Vercel)
```
NEXT_PUBLIC_SITE_URL=https://destexplore.eu
```
(Replace with your actual production domain)

### Preview (Vercel - Optional)
If you want preview deployments to use their own URLs:
```
NEXT_PUBLIC_SITE_URL=https://your-app-git-branch.vercel.app
```
Or use Vercel's automatic preview URL detection (leave unset).

---

## 🚨 Troubleshooting

### Issue: URLs still showing fallback domain
**Solution:** 
1. Make sure variable is set in Vercel
2. Redeploy the application
3. Clear browser cache
4. Check that variable name is exactly `NEXT_PUBLIC_SITE_URL` (case-sensitive)

### Issue: Getting "Invalid URL" errors
**Solution:**
- Make sure URL includes protocol (`https://` or `http://`)
- No trailing slash
- Valid domain format

### Issue: Different URLs in dev vs production
**Solution:**
- This is expected! Dev uses localhost, production uses your domain
- Make sure both are set correctly in their respective environments

---

## 📝 Summary

**For Local Development:**
- ✅ Optional - can leave unset (defaults to `http://localhost:3000`)
- ✅ Or add to `.env.local`: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

**For Vercel Production:**
- ✅ **Required** - Add in Vercel dashboard: `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
- ✅ Set for all environments (or just Production if you prefer)
- ✅ Redeploy after adding

That's it! 🎉

