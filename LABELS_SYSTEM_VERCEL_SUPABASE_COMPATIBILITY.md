# Labels System - Vercel/Supabase Compatibility Review

## ✅ Compatibility Check

### 1. Database Schema (Supabase PostgreSQL)
**Status**: ✅ Fully Compatible

All tables use standard PostgreSQL types that Supabase supports:
- UUID (with `uuid_generate_v4()`)
- TEXT, INTEGER, BOOLEAN
- TIMESTAMPTZ
- JSONB
- TEXT[] arrays
- Foreign keys with CASCADE

**No changes needed** - schema is Supabase-ready.

---

### 2. Vercel Cron Jobs
**Status**: ✅ Compatible (needs configuration)

**Current Setup**: `vercel.json` already has cron example:
```json
{
  "crons": [
    {
      "path": "/api/email/sequence/trigger",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Required Additions**:
```json
{
  "crons": [
    {
      "path": "/api/email/sequence/trigger",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/auto-top-pages/regenerate-daily",
      "schedule": "0 2 * * *"  // Daily at 2 AM UTC
    },
    {
      "path": "/api/auto-top-pages/regenerate-weekly",
      "schedule": "0 3 * * 0"  // Weekly on Sunday at 3 AM UTC
    }
  ]
}
```

**API Routes Needed**:
- `/app/api/auto-top-pages/regenerate-daily/route.ts`
- `/app/api/auto-top-pages/regenerate-weekly/route.ts`

**Implementation**:
- Use Vercel Cron API: `req.headers.get('x-vercel-cron')` for security
- Query all active OMDs
- Regenerate pages based on schedule (daily vs weekly)
- Use Supabase service role client for database access

---

### 3. Row Level Security (RLS) Policies
**Status**: ⚠️ Needs Implementation

**Pattern from existing migrations**:
- Public read access for published/active content
- Authenticated users can manage their own content
- OMD admins can manage content in their OMD
- Super admins can manage everything

**Required RLS Policies**:

#### Label Categories
```sql
-- Public can view active categories
CREATE POLICY "Public can view active label categories"
ON label_categories FOR SELECT
TO public
USING (is_active = true);

-- OMD admins can manage categories in their OMD
CREATE POLICY "OMD admins can manage label categories"
ON label_categories FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = label_categories.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);
```

#### Labels
```sql
-- Public can view active labels
CREATE POLICY "Public can view active labels"
ON labels FOR SELECT
TO public
USING (is_active = true);

-- OMD admins can manage labels in their OMD
CREATE POLICY "OMD admins can manage labels"
ON labels FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = labels.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);
```

#### Business Labels
```sql
-- Public can view business labels (for filtering)
CREATE POLICY "Public can view business labels"
ON business_labels FOR SELECT
TO public
USING (true);

-- Business owners can select labels for their businesses
CREATE POLICY "Business owners can manage their labels"
ON business_labels FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = business_labels.business_id
    AND businesses.owner_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM labels
      WHERE labels.id = business_labels.label_id
      AND labels.is_omd_awarded_only = true
    )
  )
);

-- OMD admins can award labels to any business in their OMD
CREATE POLICY "OMD admins can award labels"
ON business_labels FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN user_profiles up ON up.omd_id = b.omd_id
    WHERE b.id = business_labels.business_id
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
);
```

#### Landing Pages
```sql
-- Public can view published landing pages
CREATE POLICY "Public can view published landing pages"
ON landing_pages FOR SELECT
TO public
USING (is_published = true);

-- OMD admins can manage landing pages in their OMD
CREATE POLICY "OMD admins can manage landing pages"
ON landing_pages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = landing_pages.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);
```

#### Auto-Generated Top Pages
```sql
-- Public can view active auto-generated pages
CREATE POLICY "Public can view active auto-generated pages"
ON auto_top_pages FOR SELECT
TO public
USING (is_active = true);

-- Super admins can manage all auto-generated pages
CREATE POLICY "Super admins can manage auto-generated pages"
ON auto_top_pages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
);
```

#### Label Templates
```sql
-- Public can view global templates
CREATE POLICY "Public can view global templates"
ON label_templates FOR SELECT
TO public
USING (is_global = true);

-- Super admins can manage all templates
CREATE POLICY "Super admins can manage templates"
ON label_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
);
```

---

### 4. API Routes Structure
**Status**: ✅ Compatible (follows existing patterns)

**Existing Pattern**:
- `/app/api/{resource}/route.ts` for CRUD
- `/app/api/{resource}/{action}/route.ts` for specific actions
- Uses `createClient()` from `@/lib/supabase/server`

**New Routes Needed**:
```
/app/api/labels/
  ├── categories/
  │   └── route.ts (GET, POST)
  │   └── [id]/
  │       └── route.ts (GET, PUT, DELETE)
  ├── route.ts (GET, POST)
  └── [id]/
      └── route.ts (GET, PUT, DELETE)

/app/api/businesses/[id]/labels/
  └── route.ts (GET, POST, DELETE)

/app/api/landing-pages/
  ├── route.ts (GET, POST)
  ├── [id]/
  │   ├── route.ts (GET, PUT, DELETE)
  │   ├── publish/
  │   │   └── route.ts (POST)
  │   └── unpublish/
  │       └── route.ts (POST)

/app/api/auto-top-pages/
  ├── route.ts (GET, POST, PUT, DELETE)
  ├── [id]/
  │   ├── route.ts (GET, PUT, DELETE)
  │   └── regenerate/
  │       └── route.ts (POST)
  ├── regenerate-daily/
  │   └── route.ts (POST) - Vercel Cron
  └── regenerate-weekly/
      └── route.ts (POST) - Vercel Cron

/app/api/ai/
  └── generate-landing-page-content/
      └── route.ts (POST)

/app/api/label-templates/
  ├── route.ts (GET, POST)
  ├── [id]/
  │   └── route.ts (GET, PUT, DELETE)
  └── [id]/apply/
      └── route.ts (POST)
```

---

### 5. Regeneration Strategy
**Status**: ✅ Compatible with Vercel Cron

**Daily Regeneration** (`/api/auto-top-pages/regenerate-daily`):
- Pages with `time_period = 'last_7_days'`
- Pages with `time_period = 'this_month'`
- Pages that need price updates (cheapest pages)
- Runs at 2 AM UTC daily

**Weekly Regeneration** (`/api/auto-top-pages/regenerate-weekly`):
- Pages with `time_period = 'all_time'`
- Pages by property type, star rating, difficulty
- Highest rated pages
- Runs on Sunday at 3 AM UTC

**Implementation**:
```typescript
// /app/api/auto-top-pages/regenerate-daily/route.ts
export async function POST(req: Request) {
  // Verify Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createServiceClient(); // Service role for admin access
  
  // Get all active OMDs
  const { data: omds } = await supabase
    .from('omds')
    .select('id')
    .eq('status', 'active');

  // Regenerate daily pages for each OMD
  for (const omd of omds || []) {
    await regenerateDailyPages(omd.id, supabase);
  }

  return Response.json({ success: true });
}
```

**Security**:
- Use `CRON_SECRET` environment variable
- Verify in request headers
- Use Supabase service role client (bypasses RLS)

---

### 6. Supabase Service Role Client
**Status**: ✅ Already exists

**Check**: `lib/supabase/service.ts` should exist
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- Needed for cron jobs (bypass RLS)
- Needed for admin operations

---

### 7. Database Functions/Triggers
**Status**: ✅ Compatible

**Triggers Needed**:
```sql
-- Update updated_at for new tables
CREATE TRIGGER update_label_categories_updated_at
  BEFORE UPDATE ON label_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labels_updated_at
  BEFORE UPDATE ON labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Similar for other tables...
```

**Functions**: Use existing `update_updated_at_column()` function.

---

### 8. Indexes for Performance
**Status**: ✅ Already in plan

All foreign keys and frequently queried columns are indexed:
- `idx_labels_category_id`
- `idx_labels_omd_id`
- `idx_business_labels_business_id`
- `idx_landing_pages_omd_id`
- `idx_auto_top_pages_omd_id`

**Supabase handles indexes automatically**, but explicit indexes help with query planning.

---

### 9. Environment Variables
**Status**: ✅ Compatible

**Required Variables** (already exist):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (for curated landing pages)

**New Variable Needed**:
- `CRON_SECRET` - Secret for Vercel cron authentication

---

### 10. Migration Strategy
**Status**: ✅ Compatible

**Follow existing pattern**:
- Create migration file: `migrations/64_labels_system.sql`
- Run in Supabase SQL Editor
- Test RLS policies
- Verify indexes

**Migration Order**:
1. Create tables
2. Create indexes
3. Create triggers
4. Enable RLS
5. Create RLS policies
6. Insert default data (if any)

---

## Summary

### ✅ What Works:
- Database schema (100% Supabase compatible)
- API routes structure (follows existing patterns)
- Vercel cron jobs (just need to add routes)
- RLS patterns (clear from existing migrations)
- Service role client (already exists)

### ⚠️ What Needs Implementation:
1. **RLS Policies** - Add for all new tables (follow existing patterns)
2. **Cron Routes** - Create `/api/auto-top-pages/regenerate-daily` and `/regenerate-weekly`
3. **CRON_SECRET** - Add to environment variables
4. **Migration File** - Create comprehensive migration with RLS policies
5. **Triggers** - Add `updated_at` triggers for new tables

### 📝 Action Items:
1. Create migration file with all tables + RLS policies
2. Add cron routes for regeneration
3. Add `CRON_SECRET` to `.env.local` and Vercel dashboard
4. Update `vercel.json` with new cron schedules
5. Test RLS policies with different user roles

**Overall Status**: ✅ **Fully Compatible** - Just needs implementation following existing patterns.

