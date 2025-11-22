# Generated Pages Implementation Plan

## Overview
This document outlines the implementation plan for two types of generated pages:
1. **Label-based Landing Pages** - Curated pages based on label combinations (e.g., "Weekend la mare")
2. **Auto-Generated Top Pages** - Dynamic ranking pages (e.g., "Top 5 Cele Mai Rezervate Hoteluri")

---

## Current Status

### ✅ Completed
- Phase 1: Core Labels System
  - Database schema for labels, categories, business_labels
  - OMD dashboard - Labels management
  - Business dashboard - Labels selection
  - Activity logging and tracking

### 🚧 Next Steps
- Phase 2: Label-based Landing Pages
- Phase 4: Auto-Generated Top Pages

---

## Phase 2: Label-Based Landing Pages

### 2.1 Database Schema (Already Defined)
Tables needed:
- `landing_pages` - Main landing page data
- `landing_page_labels` - Junction table
- `landing_page_businesses` - Optional manual overrides

**Status**: Schema defined in plan, needs migration

### 2.2 Implementation Steps

#### Step 1: Create Database Migration
- Create `migrations/66_landing_pages.sql`
- Include all tables from plan
- Add indexes for performance

#### Step 2: API Routes
Create the following API endpoints:

**Landing Pages API** (`/app/api/landing-pages/`):
- `GET /api/landing-pages` - List all landing pages for OMD
- `POST /api/landing-pages` - Create new landing page
- `GET /api/landing-pages/[id]` - Get landing page details
- `PUT /api/landing-pages/[id]` - Update landing page
- `DELETE /api/landing-pages/[id]` - Delete landing page
- `POST /api/landing-pages/[id]/publish` - Publish/unpublish

**AI Content Generation** (`/app/api/ai/`):
- `POST /api/ai/generate-landing-page-content` - Generate SEO content with GPT-4o mini

#### Step 3: OMD Dashboard - Landing Pages Manager
**Component**: `/components/admin/LandingPagesManager.tsx`
- List all landing pages (published, drafts)
- Filter by status, type
- Create new landing page button
- Edit/delete actions

**Component**: `/components/admin/LandingPageEditor.tsx`
- Label selection (multi-select with search)
- Preview matching businesses
- "Generate with AI" button
- Content editing (title, meta description, header, slug, intro)
- Business selection/ordering
- Preview mode
- Publish/Draft toggle

#### Step 4: Public Landing Page Display
**Route**: `/app/[omdSlug]/labels/[slug]/page.tsx`
- Display landing page content
- Show matching businesses (from `landing_page_businesses` or auto-matched by labels)
- Related label pages section
- Breadcrumbs
- Internal links
- "Auto-Generated" badge if applicable

#### Step 5: Business Matching Logic
**Function**: Match businesses to landing pages based on labels
- Query businesses that have ALL selected labels
- Order by relevance (number of matching labels, then rating)
- Support manual overrides via `landing_page_businesses`

---

## Phase 4: Auto-Generated Top Pages

### 4.1 Database Schema (Already Defined)
Tables needed:
- `auto_top_pages` - Page configuration and templates
- `auto_top_page_content` - Cached business rankings

**Status**: Schema defined in plan, needs migration

### 4.2 Implementation Steps

#### Step 1: Create Database Migration
- Create `migrations/67_auto_top_pages.sql`
- Include all tables from plan
- Add initial page configurations for all 32 pages
- Add indexes for performance

#### Step 2: Data Aggregation Functions
Create SQL functions or TypeScript utilities to:
- Count hotel reservations (by time period)
- Count restaurant reservations (by time period)
- Count experience bookings (by time period)
- Get cheapest hotels/experiences
- Get highest rated businesses
- Filter by property type, star rating, price range, difficulty

**Location**: `/lib/data-aggregation/` or database functions

#### Step 3: API Routes
**Auto-Generated Pages API** (`/app/api/auto-top-pages/`):
- `GET /api/auto-top-pages` - Get all page configs for OMD
- `POST /api/auto-top-pages` - Create/configure page (superadmin only)
- `GET /api/auto-top-pages/[id]` - Get page config
- `PUT /api/auto-top-pages/[id]` - Update page config (superadmin only)
- `DELETE /api/auto-top-pages/[id]` - Delete/disable page
- `POST /api/auto-top-pages/[id]/regenerate` - Manually regenerate content
- `POST /api/auto-top-pages/regenerate-all` - Regenerate all pages

#### Step 4: Content Generation Service
**Service**: `/lib/services/auto-top-pages-generator.ts`
- Query businesses based on page criteria
- Sort by metric (bookings, price, rating, etc.)
- Take top N businesses
- Fill templates with database data
- Cache results in `auto_top_page_content`
- Support template placeholders: `{count}`, `{destination}`, `{business_type}`, `{metric}`, `{business1}`, `{business2}`, `{business3}`

#### Step 5: Cron Job for Auto-Regeneration
**Route**: `/app/api/cron/regenerate-top-pages/route.ts`
- Daily: Regenerate "last 7 days" and "this month" pages
- Weekly: Regenerate all-time pages
- Update `last_generated_at` timestamp
- Log regeneration activity

**Vercel Cron Config** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/regenerate-top-pages",
      "schedule": "0 2 * * *" // Daily at 2 AM
    }
  ]
}
```

#### Step 6: Superadmin Dashboard - Auto-Generated Pages Manager
**Component**: `/components/admin/AutoTopPagesManager.tsx`
- List all 32 page types
- Enable/disable individual pages
- Edit templates (title, meta description, header, intro)
- Preview template output with sample data
- Manual regeneration button
- View last generation time
- Adjust count (3, 5, 10)

**Component**: `/components/admin/AutoTopPageEditor.tsx`
- Template editor for each page type
- Preview with sample data
- Save templates (applies globally to all OMDs)

#### Step 7: Public Auto-Generated Page Display
**Route**: `/app/[omdSlug]/top/[pageType]/[businessType]/[timePeriod]/page.tsx`
- Dynamic route handling for all page types
- Display businesses in ranked order
- Show metric values (bookings count, price, rating, etc.)
- "Last updated" timestamp
- Link to individual business pages
- Related top pages section
- Breadcrumbs
- Structured data (ItemList schema)

**Route Examples**:
- `/constanta/top/most-booked-hotels/all-time`
- `/constanta/top/cheapest-hotels`
- `/constanta/top/most-visited-restaurants/last-7-days`
- `/constanta/top/highest-rated-experiences`

---

## Implementation Priority

### High Priority (MVP)
1. **Auto-Generated Top Pages** (Phase 4)
   - Simpler to implement (no AI, pure templates)
   - Immediate SEO value
   - 32 pages per OMD = significant content
   - Can be fully automated

2. **Basic Landing Pages** (Phase 2 - Simplified)
   - Manual creation by OMD admins
   - No AI initially (manual content entry)
   - Label-based business matching

### Medium Priority
3. **AI Content Generation** (Phase 2 - Enhancement)
   - Add GPT-4o mini integration
   - Generate SEO content automatically
   - Improve landing page creation workflow

4. **Internal Linking** (Phase 3)
   - Related pages sections
   - Business page "Afișat în" section
   - Breadcrumbs

### Low Priority
5. **Label Templates** (Phase 2 - Enhancement)
6. **Multi-Language Support** (Phase 5)
7. **Advanced SEO** (Phase 6)

---

## Technical Considerations

### Performance
- **Caching**: Use `auto_top_page_content` table to cache rankings
- **ISR**: Use Next.js ISR (Incremental Static Regeneration) for public pages
- **Revalidation**: Revalidate on cron job completion
- **Database Indexes**: Ensure all foreign keys and query fields are indexed

### SEO
- **Meta Tags**: Dynamic title and description from templates
- **Structured Data**: JSON-LD for ItemList (top pages) and CollectionPage (landing pages)
- **Sitemap**: Include all published pages
- **URL Structure**: Clean, descriptive URLs

### Error Handling
- **Minimum Data**: Only show pages if at least 3 businesses match
- **Fallbacks**: Show message if no data available
- **Template Errors**: Fallback to default template if placeholder fails

### Security
- **RLS Policies**: Ensure proper Row Level Security
- **Permissions**: Superadmin-only for template editing
- **Validation**: Validate all template placeholders

---

## Estimated Timeline

### Phase 4: Auto-Generated Top Pages (2-3 weeks)
- Week 1: Database migration, data aggregation, content generation service
- Week 2: API routes, cron job, superadmin dashboard
- Week 3: Public pages, testing, polish

### Phase 2: Landing Pages (2-3 weeks)
- Week 1: Database migration, API routes, basic OMD dashboard
- Week 2: Public pages, business matching, basic features
- Week 3: AI integration (optional), testing, polish

---

## Next Immediate Steps

1. **Create database migrations** for both systems
2. **Start with Auto-Generated Top Pages** (simpler, higher value)
3. **Implement data aggregation queries**
4. **Build content generation service**
5. **Create superadmin dashboard for template management**
6. **Set up cron job for auto-regeneration**
7. **Build public page routes**

---

**Status**: Ready to Begin Implementation
**Last Updated**: 2024

