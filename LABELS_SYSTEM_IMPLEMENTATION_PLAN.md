# Labels System Implementation Plan

## Overview
A comprehensive labels system for businesses that enables filtering, curated landing pages, and SEO optimization. Labels are organized by categories, managed by OMD admins, and can be selected by businesses or awarded by OMD managers.

---

## 1. Database Schema

### 1.1 Label Categories Table
```sql
CREATE TABLE label_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(omd_id, name)
);
```

### 1.2 Labels Table
```sql
CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES label_categories(id) ON DELETE CASCADE,
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Base name (used as key for translations)
  description TEXT, -- Human-readable description
  display_name TEXT, -- Optional display name (for localization)
  business_types TEXT[] DEFAULT '{}', -- ['hotel', 'restaurant', 'experience'] or [] for all
  is_omd_awarded_only BOOLEAN DEFAULT false, -- If true, businesses can't select it
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, name)
);
```

### 1.2.1 Label Translations Table
```sql
CREATE TABLE label_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  language TEXT NOT NULL, -- 'ro', 'en', 'de', etc.
  name TEXT NOT NULL, -- Translated name
  description TEXT, -- Translated description
  display_name TEXT, -- Translated display name
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(label_id, language)
);
```

### 1.2.2 Label Templates Table
```sql
CREATE TABLE label_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- Template name (e.g., "Family-Friendly Set")
  description TEXT, -- Template description
  category_id UUID REFERENCES label_categories(id) ON DELETE SET NULL,
  business_types TEXT[] DEFAULT '{}', -- Which business types this template applies to
  is_global BOOLEAN DEFAULT false, -- If true, available to all OMDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2.3 Label Template Labels Junction
```sql
CREATE TABLE label_template_labels (
  template_id UUID NOT NULL REFERENCES label_templates(id) ON DELETE CASCADE,
  label_name TEXT NOT NULL, -- Label name (not ID, for template portability)
  order_index INTEGER DEFAULT 0,
  PRIMARY KEY (template_id, label_name)
);
```

### 1.3 Business Labels Junction Table
```sql
CREATE TABLE business_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id), -- Who assigned it (business owner or OMD admin)
  is_omd_awarded BOOLEAN DEFAULT false, -- True if awarded by OMD, false if selected by business
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, label_id)
);
```

### 1.4 Landing Pages Table
```sql
CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- SEO title
  meta_description TEXT NOT NULL, -- Meta description
  header_text TEXT NOT NULL, -- H1 header
  url_slug TEXT NOT NULL, -- URL-friendly slug
  intro_text TEXT, -- Introduction paragraph
  page_type TEXT NOT NULL DEFAULT 'curated' CHECK (page_type IN ('curated', 'auto_generated')), -- 'curated' or 'auto_generated'
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id), -- OMD manager who created it (NULL for auto-generated)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(omd_id, url_slug)
);
```

### 1.4.1 Auto-Generated Top Pages Table
```sql
CREATE TABLE auto_top_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL, -- 'top_booked', 'top_cheapest', 'top_rated', 'top_visited', 'top_recent'
  business_type TEXT NOT NULL, -- 'hotel', 'restaurant', 'experience', 'all'
  title_template TEXT NOT NULL, -- "Top 5 cele mai rezervate hoteluri"
  meta_description_template TEXT NOT NULL,
  header_template TEXT NOT NULL,
  url_slug TEXT NOT NULL, -- Auto-generated slug
  time_period TEXT, -- 'week', 'month', 'all_time', 'last_7_days'
  count INTEGER DEFAULT 5, -- How many businesses to show
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ, -- When content was last regenerated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(omd_id, page_type, business_type, time_period)
);
```

### 1.4.2 Auto-Generated Page Content (Cached Results)
```sql
CREATE TABLE auto_top_page_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auto_top_page_id UUID NOT NULL REFERENCES auto_top_pages(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL, -- 1, 2, 3, 4, 5
  metric_value DECIMAL(10,2), -- The value that determined ranking (bookings count, price, rating, etc.)
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (auto_top_page_id, business_id)
);
```

### 1.5 Landing Page Labels Junction
```sql
CREATE TABLE landing_page_labels (
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (landing_page_id, label_id)
);
```

### 1.6 Landing Page Businesses (Optional Manual Override)
```sql
CREATE TABLE landing_page_businesses (
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0, -- Manual ordering
  is_manually_added BOOLEAN DEFAULT false, -- True if manually added, false if auto-matched
  PRIMARY KEY (landing_page_id, business_id)
);
```

### 1.7 Internal Links Tracking (Optional - for analytics)
```sql
CREATE TABLE internal_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_page_type TEXT NOT NULL, -- 'label_page', 'business', 'destination', 'homepage'
  from_page_id UUID,
  to_page_type TEXT NOT NULL,
  to_page_id UUID,
  anchor_text TEXT,
  link_position TEXT, -- 'content', 'sidebar', 'footer', 'related', 'breadcrumb'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.8 Indexes
```sql
CREATE INDEX idx_labels_category_id ON labels(category_id);
CREATE INDEX idx_labels_omd_id ON labels(omd_id);
CREATE INDEX idx_labels_business_types ON labels USING GIN(business_types);
CREATE INDEX idx_label_translations_label_id ON label_translations(label_id);
CREATE INDEX idx_label_translations_language ON label_translations(language);
CREATE INDEX idx_business_labels_business_id ON business_labels(business_id);
CREATE INDEX idx_business_labels_label_id ON business_labels(label_id);
CREATE INDEX idx_landing_pages_omd_id ON landing_pages(omd_id);
CREATE INDEX idx_landing_pages_slug ON landing_pages(omd_id, url_slug);
CREATE INDEX idx_landing_pages_type ON landing_pages(page_type);
CREATE INDEX idx_landing_page_labels_landing_page ON landing_page_labels(landing_page_id);
CREATE INDEX idx_landing_page_labels_label ON landing_page_labels(label_id);
CREATE INDEX idx_landing_page_businesses_landing_page ON landing_page_businesses(landing_page_id);
CREATE INDEX idx_auto_top_pages_omd_id ON auto_top_pages(omd_id);
CREATE INDEX idx_auto_top_pages_type ON auto_top_pages(page_type, business_type);
CREATE INDEX idx_auto_top_page_content_page_id ON auto_top_page_content(auto_top_page_id);
```

---

## 2. Features by User Type

### 2.1 Business Owner Dashboard

#### Labels Menu Section
- **Location**: Business Dashboard → Settings → Labels
- **Features**:
  - Explanation text: "Labels help your listing get visibility and appear in special sections/pages that we auto-generate. Use them to help customers find you."
  - List of available labels (grouped by category)
  - Filter by business type (only show labels available to their business type)
  - Show which labels are OMD-awarded only (read-only, can't select)
  - Multi-select interface to choose labels
  - Show currently selected labels
  - Save button

#### Label Display
- Show label name and description
- Show category name
- Visual indicator for OMD-awarded labels (badge/icon)
- Search/filter labels by name or category

### 2.2 OMD Admin Dashboard

#### Labels Management Menu
- **Location**: OMD Dashboard → Content → Labels
- **Features**:

##### Categories Management
- List all categories
- Add new category (name, description, order)
- Edit category
- Delete category (with confirmation - warns about labels in category)
- Reorder categories (drag & drop)

##### Labels Management
- View all labels grouped by category
- Add new label:
  - Select category
  - Name
  - Description
  - Display name (optional)
  - Business types (multi-select: hotel, restaurant, experience, or "all")
  - "OMD Awarded Only" checkbox
  - Order index
- Edit label
- Delete label (with confirmation)
- Reorder labels within category
- Filter by category or business type

##### Business Labels Overview
- View all businesses with their labels
- Filter by business type
- Filter by label
- For each business:
  - Show all labels (with indicator: business-selected vs OMD-awarded)
  - Add labels to business (multi-select)
  - Remove labels from business
  - See who assigned each label and when

##### Label Templates Management
- **Location**: OMD Dashboard → Content → Label Templates
- View available templates (global + OMD-specific)
- Create new template:
  - Name and description
  - Select category (optional)
  - Select business types
  - Add labels to template (multi-select)
  - Save template
- Apply template to OMD:
  - Select template
  - System creates labels from template (if they don't exist)
  - Assigns labels to selected businesses (optional)
- Edit/delete templates

##### Landing Pages Management
- **Location**: OMD Dashboard → Content → Landing Pages
- List all landing pages (published, drafts, curated, auto-generated)
- Filter by page type (curated vs auto-generated)
- **Create Curated Landing Page**:
  1. Select labels (multi-select with search)
  2. System shows preview of matching businesses
  3. Click "Generate with AI" button
  4. GPT-4o mini generates:
     - SEO Title
     - Meta Description
     - Header Text
     - URL Slug
     - Intro Text
  5. Review and edit all generated content
  6. Optionally reorder/remove businesses
  7. Optionally add businesses manually
  8. Preview page
  9. Publish or save as draft
- Edit existing landing page
- Delete landing page
- Duplicate landing page
- View analytics (if implemented later)

##### Auto-Generated Top Pages Management
- **Location**: OMD Dashboard → Content → Auto-Generated Pages
- List all auto-generated page types
- **Configure Auto-Generated Pages**:
  - Enable/disable specific page types:
    - Top 5 cele mai rezervate hoteluri
    - Top 5 cele mai ieftine hoteluri
    - Top 5 cele mai vizitate restaurante
    - Top 5 experiențe în ultima săptămână
    - Top 5 cele mai bine evaluate
    - etc.
  - Configure for each:
    - Business type (hotel, restaurant, experience, all)
    - Time period (week, month, all_time, last_7_days)
    - Count (how many businesses to show - default 5)
    - Title template (with placeholders: {count}, {business_type}, {time_period})
    - Meta description template
    - Header template
    - URL slug
  - Preview generated content
  - Enable/disable individual pages
- **Manual Regeneration**:
  - Button to manually regenerate all auto-generated pages
  - Shows last generation time
  - Can regenerate individual pages
- **Auto-Regeneration**:
  - Cron job runs daily/weekly to regenerate content
  - Updates based on latest booking/visit/rating data

---

## 3. AI Integration (GPT-4o mini)

### 3.1 API Endpoint
- **Route**: `/api/ai/generate-landing-page-content`
- **Method**: POST
- **Input**:
  ```json
  {
    "omd_id": "uuid",
    "omd_name": "Constanta",
    "omd_location": "Romania",
    "selected_labels": ["weekend", "mare", "escapada"],
    "matching_businesses": [
      { "name": "Hotel X", "type": "hotel" },
      { "name": "Restaurant Y", "type": "restaurant" }
    ],
    "language": "ro"
  }
  ```
- **Output**:
  ```json
  {
    "title": "Weekend la mare - Cele mai bune locații",
    "meta_description": "Descoperă cele mai bune locații...",
    "header_text": "Weekend la mare - Cele mai bune locații",
    "url_slug": "weekend-la-mare",
    "intro_text": "Descoperă cele mai bune locații pentru un weekend la mare..."
  }
  ```

### 3.2 GPT Prompt Template
```
You are creating a landing page for a destination marketing website.

Destination: {omd_name}
Location: {omd_location}
Selected Labels: {selected_labels}
Matching Businesses: {matching_businesses}
Language: {language}

Generate SEO-optimized content in {language}:
1. SEO Title (60 characters max, compelling, keyword-rich)
2. Meta Description (160 characters max, includes call-to-action)
3. Header Text (H1, natural and engaging)
4. URL Slug (URL-friendly, lowercase, hyphens, no special chars)
5. Short intro paragraph (2-3 sentences, engaging, includes keywords naturally)

Make it compelling, SEO-friendly, and natural. Use the labels naturally in the content.
```

### 3.3 Error Handling
- If GPT API fails, show fallback: "Unable to generate content. Please enter manually."
- Allow manual entry of all fields
- Retry button for failed requests

### 3.4 Multi-Language Support
- Labels support translations via `label_translations` table
- When displaying labels, use current language from user preference/OMD settings
- Fallback to base language if translation not available
- OMD managers can add translations for labels
- AI content generation supports multiple languages (specify in API call)

### 3.5 Auto-Generated Top Pages Content
- **Data Sources**:
  - Bookings: Count from `reservations` table (hotels, experiences)
  - Restaurant visits: Count from `restaurant_reservations` table
  - Prices: From `rooms.base_price` (hotels) or `experiences.price_from`
  - Ratings: From `businesses.rating` or `reviews.rating`
  - Recent activity: From `reservations.created_at` or `restaurant_reservations.created_at`
- **Content Generation Strategy**:
  - **100% Template-Based**: All content uses templates with database placeholders
    - Title template: `"Top {count} Cele Mai Rezervate Hoteluri în {destination}"`
    - Meta description template: `"Descoperă cele mai rezervate hoteluri din {destination}. {business1}, {business2}, {business3} și altele."`
    - Header template: Same as title
    - Intro template (optional): `"Aceste {business_type} au fost cele mai {metric} în {destination}."`
    - Database fills placeholders: `{count}`, `{destination}`, `{business_type}`, `{metric}`, `{business1}`, `{business2}`, `{business3}`
    - **No AI generation** - pure template replacement
  - **Template Management**: Superadmin manages all templates via admin dashboard
    - Templates stored in `auto_top_pages` table
    - Global templates (apply to all OMDs)
    - Can edit title, meta description, header, intro templates per page type
  - **Business List**: Pure database data (names, images, ratings, prices)
- **Generation Logic**:
  - Query businesses based on criteria
  - Sort by metric (bookings count, price ASC, rating DESC, etc.)
  - Take top N businesses
  - Fill templates with database data
  - Cache results in `auto_top_page_content` table
- **Update Frequency**:
  - Daily cron job for "last 7 days" pages
  - Weekly cron job for "this week/month" pages
  - On-demand regeneration via OMD dashboard
  - **Business list updates** automatically, templates remain static until superadmin edits them

---

## 4. Internal Linking Strategy

### 4.1 Automatic Link Generation

#### On Label Landing Pages
- **Related Label Pages Section**:
  - Find other landing pages that share at least one label
  - Show 3-5 most relevant (based on shared labels count)
  - Display as: "Vezi și: [Link 1] [Link 2] [Link 3]"
  - Use label page title as anchor text

- **Featured Businesses Section**:
  - Link to all businesses matching the labels
  - Use business name as anchor text
  - Group by business type (Hotels, Restaurants, Experiences)

- **Breadcrumbs**:
  - Home > {Destination} > {Label Page Title}
  - Each level is a clickable link

- **Contextual Links in Content**:
  - Parse intro_text for business names and label names
  - Auto-link to business pages and related label pages
  - Use descriptive anchor text

#### On Business Pages
- **"Afișat în:" Section**:
  - Show all label landing pages where this business appears
  - Auto-generated based on business_labels
  - Display as badges/links

- **"Locații similare:" Section**:
  - Find other businesses with same labels
  - Show 3-5 most similar (based on shared labels)
  - Link to their business pages

- **Breadcrumbs**:
  - Home > {Destination} > {Business Type} > {Business Name}
  - Include link to relevant label pages if applicable

#### On Destination Homepage
- **Featured Label Pages Section**:
  - Show 5-10 most popular/published label landing pages
  - Link to them with descriptive anchor text

- **Label Categories Navigation**:
  - Link to label category pages (if implemented)
  - Or link to popular label combinations

### 4.2 Manual Link Control
- OMD managers can add custom links in landing page intro_text
- Use markdown or rich text editor for link insertion
- Format: `[anchor text](/constanta/weekend-la-mare)`

### 4.3 Link Tracking (Optional)
- Track internal link clicks for analytics
- Store in `internal_links` table
- Can be used to identify popular link paths

---

## 5. Frontend Implementation

### 5.1 Business Dashboard - Labels Page
```
/components/business/LabelsManager.tsx
- Display available labels by category
- Multi-select interface
- Save functionality
- Show OMD-awarded labels (read-only)
```

### 5.2 OMD Dashboard - Labels Management
```
/components/admin/LabelCategoriesManager.tsx
- List, add, edit, delete categories
- Reorder categories

/components/admin/LabelsManager.tsx
- List, add, edit, delete labels
- Filter by category/business type
- Reorder labels

/components/admin/BusinessLabelsManager.tsx
- View all businesses with labels
- Add/remove labels from businesses
- Filter and search
```

### 5.3 OMD Dashboard - Landing Pages
```
/components/admin/LandingPagesManager.tsx
- List all landing pages
- Create, edit, delete landing pages

/components/admin/LandingPageEditor.tsx
- Label selection
- AI content generation
- Content editing (title, description, header, slug, intro)
- Business selection/ordering
- Preview
- Publish/Draft
```

### 5.4 Public Landing Page
```
/app/[omdSlug]/labels/[slug]/page.tsx
- Display landing page content
- Show matching businesses
- Related label pages section
- Breadcrumbs
- Internal links
- Show "Auto-Generated" badge if page_type = 'auto_generated'
```

### 5.5 Auto-Generated Top Pages
```
/app/[omdSlug]/top/[pageType]/[businessType]/page.tsx
- Display auto-generated top pages
- Show businesses in ranked order
- Display metric values (bookings count, price, rating, etc.)
- "Last updated" timestamp
- Link to individual business pages
- Related top pages section
- Breadcrumbs
```

### 5.6 Label Templates UI
```
/components/admin/LabelTemplatesManager.tsx
- List templates
- Create/edit templates
- Apply templates to OMD
- View template contents

/components/admin/LabelTemplateEditor.tsx
- Template name/description
- Category selection
- Business type selection
- Label selection (multi-select)
- Preview template
```

---

## 6. API Routes

### 6.1 Labels API
```
GET    /api/labels/categories          - Get all categories for OMD
POST   /api/labels/categories          - Create category
PUT    /api/labels/categories/:id      - Update category
DELETE /api/labels/categories/:id     - Delete category

GET    /api/labels                     - Get all labels (filtered by business type if business owner)
POST   /api/labels                     - Create label (OMD only)
PUT    /api/labels/:id                 - Update label (OMD only)
DELETE /api/labels/:id                - Delete label (OMD only)

GET    /api/businesses/:id/labels      - Get labels for business
POST   /api/businesses/:id/labels      - Add labels to business
DELETE /api/businesses/:id/labels/:labelId - Remove label from business
```

### 6.2 Landing Pages API
```
GET    /api/landing-pages              - Get all landing pages for OMD
POST   /api/landing-pages              - Create landing page
GET    /api/landing-pages/:id          - Get landing page details
PUT    /api/landing-pages/:id          - Update landing page
DELETE /api/landing-pages/:id          - Delete landing page
POST   /api/landing-pages/:id/publish  - Publish landing page
POST   /api/landing-pages/:id/unpublish - Unpublish landing page
```

### 6.3 AI API
```
POST   /api/ai/generate-landing-page-content - Generate content with GPT-4o mini
```

### 6.4 Label Templates API
```
GET    /api/label-templates                 - Get all templates (global + OMD-specific)
POST   /api/label-templates                 - Create template (OMD only)
GET    /api/label-templates/:id            - Get template details
PUT    /api/label-templates/:id            - Update template
DELETE /api/label-templates/:id            - Delete template
POST   /api/label-templates/:id/apply      - Apply template to OMD (creates labels)
```

### 6.5 Label Translations API
```
GET    /api/labels/:id/translations        - Get all translations for label
POST   /api/labels/:id/translations        - Add translation
PUT    /api/labels/:id/translations/:lang  - Update translation
DELETE /api/labels/:id/translations/:lang - Delete translation
```

### 6.6 Auto-Generated Top Pages API
```
GET    /api/auto-top-pages                 - Get all auto-generated page configs
POST   /api/auto-top-pages                 - Create/configure auto-generated page
GET    /api/auto-top-pages/:id            - Get page config
PUT    /api/auto-top-pages/:id            - Update page config
DELETE /api/auto-top-pages/:id            - Delete/disable page
POST   /api/auto-top-pages/:id/regenerate - Manually regenerate page content
POST   /api/auto-top-pages/regenerate-all - Regenerate all pages
```

---

## 7. SEO Implementation

### 7.1 Landing Page SEO
- **Meta Tags**:
  - `<title>{title}</title>`
  - `<meta name="description" content="{meta_description}">`
  - Open Graph tags
  - Twitter Card tags

- **Structured Data**:
  - JSON-LD for LocalBusiness (for businesses)
  - BreadcrumbList schema
  - CollectionPage schema for landing pages
  - ItemList schema for auto-generated top pages

- **URL Structure**:
  - Curated pages: `/{omdSlug}/labels/{urlSlug}`
  - Auto-generated pages: `/{omdSlug}/top/{pageType}/{businessType}`
  - Examples: 
    - `/constanta/weekend-la-mare` (curated)
    - `/constanta/top/most-booked/hotels` (auto-generated)
    - `/constanta/top/cheapest/restaurants` (auto-generated)

- **Sitemap**:
  - Include all published landing pages (curated + auto-generated)
  - Priority: 0.8 for curated, 0.7 for auto-generated
  - Update frequency: weekly for curated, daily for auto-generated
  - Auto-generated pages marked with `<lastmod>` based on regeneration time

### 7.2 Internal Linking SEO
- Use descriptive anchor text
- Maintain 3-click rule (any page reachable in 3 clicks)
- Create topic clusters (related label pages)
- Use breadcrumbs with schema markup

---

## 8. Implementation Phases

### Phase 1: Core Labels System
1. Database schema (categories, labels, business_labels)
2. OMD dashboard - Categories management
3. OMD dashboard - Labels management
4. Business dashboard - Labels selection
5. OMD dashboard - Business labels overview

### Phase 2: Landing Pages & Templates
1. Database schema (landing_pages, landing_page_labels, landing_page_businesses)
2. Database schema (label_templates, label_template_labels)
3. OMD dashboard - Label templates management
4. OMD dashboard - Landing pages list
5. OMD dashboard - Landing page editor
6. AI integration (GPT-4o mini)
7. Public landing page display
8. Apply template functionality

### Phase 3: Internal Linking
1. Automatic related pages detection
2. Business page "Afișat în" section
3. Landing page related sections
4. Breadcrumbs implementation
5. Contextual linking in content

### Phase 4: Auto-Generated Top Pages
1. Database schema (auto_top_pages, auto_top_page_content)
2. Data aggregation queries (bookings, visits, ratings, prices)
3. OMD dashboard - Auto-generated pages configuration
4. Content generation logic (templates + GPT-4o mini)
5. Cron job for auto-regeneration
6. Public auto-generated page display
7. Manual regeneration functionality

### Phase 5: Multi-Language Support
1. Database schema (label_translations)
2. Language detection/preference system
3. OMD dashboard - Label translation interface
4. Frontend - Display labels in user's language
5. AI content generation - Multi-language support
6. Fallback to base language

### Phase 6: SEO & Polish
1. Meta tags implementation
2. Structured data (JSON-LD)
3. Sitemap generation (including auto-generated pages)
4. Analytics integration (optional)
5. Performance optimization
6. Caching for auto-generated pages

---

## 9. Additional Considerations

### 9.1 Permissions & RLS
- Business owners can only select non-OMD-awarded labels
- OMD admins can manage all labels and categories
- OMD admins can award labels to businesses
- Public can view published landing pages

### 9.2 Validation
- URL slug uniqueness per OMD
- Label name uniqueness per category
- Category name uniqueness per OMD
- Business type validation for labels

### 9.3 Performance
- Cache label lists
- Index all foreign keys
- Optimize queries for landing page business matching
- Lazy load related pages

### 9.4 Auto-Generated Pages Configuration
- **Page Types Available**:
  - `top_booked` - Most booked hotels/experiences
  - `top_cheapest` - Cheapest hotels/restaurants/experiences
  - `top_rated` - Highest rated businesses
  - `top_visited` - Most visited restaurants (by reservations)
  - `top_recent` - Most recent bookings/activity
  - `top_trending` - Trending businesses (bookings growth)
- **Time Periods**:
  - `last_7_days` - Last 7 days
  - `this_week` - Current week
  - `this_month` - Current month
  - `all_time` - All time
- **Regeneration Strategy**:
  - Cache results in `auto_top_page_content` table
  - Regenerate on schedule (daily for recent, weekly for all-time)
  - Manual regeneration available
  - Show "Last updated" timestamp on pages

### 9.5 Multi-Language Implementation
- **Supported Languages**: Romanian (ro), English (en), German (de), etc.
- **Translation Sources**:
  - OMD managers can add translations manually
  - AI can generate translations (future enhancement)
  - Fallback to base language if translation missing
- **Language Detection**:
  - User preference (stored in cookie/localStorage)
  - OMD default language setting
  - Browser language (fallback)
- **Content Translation**:
  - Label names and descriptions
  - Landing page content (stored per language or generated on-demand)
  - Auto-generated page templates (per language)

### 9.6 Label Templates
- **Pre-Made Templates** (Global):
  - "Family-Friendly Set" - Labels for family-oriented businesses
  - "Romantic Getaway" - Labels for romantic experiences
  - "Budget-Friendly" - Labels for affordable options
  - "Luxury Experience" - Labels for premium businesses
  - "Adventure & Outdoor" - Labels for adventure activities
- **Template Application**:
  - OMD selects template
  - System creates labels from template (if they don't exist)
  - Optionally assigns labels to businesses matching criteria
  - OMD can customize labels after application

### 9.7 Future Enhancements
- Label analytics (which labels drive traffic)
- A/B testing for landing pages
- Label-based email campaigns
- Label popularity tracking
- Auto-suggestions for label combinations
- AI-powered label recommendations for businesses
- Bulk label operations
- Label performance metrics

---

## 10. Testing Checklist

- [ ] Create label category
- [ ] Create label (all business types)
- [ ] Create label (specific business type)
- [ ] Create OMD-awarded-only label
- [ ] Business selects labels
- [ ] OMD awards label to business
- [ ] OMD removes label from business
- [ ] Create landing page with AI
- [ ] Edit landing page content
- [ ] Publish landing page
- [ ] View landing page (public)
- [ ] Internal links work correctly
- [ ] Breadcrumbs display correctly
- [ ] Related pages show correctly
- [ ] Business page shows "Afișat în" section
- [ ] Filter businesses by labels
- [ ] SEO meta tags render correctly
- [ ] Create label template
- [ ] Apply label template to OMD
- [ ] Add label translation
- [ ] Display labels in different languages
- [ ] Configure auto-generated top page
- [ ] Auto-generated page regenerates correctly
- [ ] Auto-generated page displays correct businesses
- [ ] Auto-generated page shows "Last updated" timestamp
- [ ] Auto-generated page links work correctly

---

**Status**: Ready for Implementation
**Last Updated**: 2024

