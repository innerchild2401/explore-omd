# 🎨 Blog Styling Specification

## Complete Design System for Blog Integration

This document provides comprehensive styling specifications for all blog components, ensuring consistency with DestExplore's design language while incorporating Medium's best practices.

---

## 1. Typography

### 1.1 Font Family

**System Font Stack** (matches existing DestExplore):
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

**Usage**: All text elements use this system font stack (no custom fonts).

---

### 1.2 Typography Scale

#### Editor Interface

| Element | Font Size | Line Height | Font Weight | Color | Usage |
|---------|-----------|-------------|-------------|-------|-------|
| **Editor Title** | `text-5xl` (48px) | `leading-tight` (1.2) | `font-bold` (700) | `text-gray-900` | Post title in editor |
| **Editor Subtitle** | `text-2xl` (24px) | `leading-relaxed` (1.6) | `font-normal` (400) | `text-gray-600` | Post subtitle in editor |
| **Editor Body** | `text-lg` (18px) | `leading-relaxed` (1.7) | `font-normal` (400) | `text-gray-900` | Paragraph text in editor |
| **Block Placeholder** | `text-lg` (18px) | `leading-relaxed` (1.7) | `font-normal` (400) | `text-gray-400` | Placeholder text |
| **Formatting Toolbar** | `text-sm` (14px) | `leading-normal` (1.5) | `font-medium` (500) | `text-gray-700` | Toolbar buttons |

#### Public Blog Pages

| Element | Font Size | Line Height | Font Weight | Color | Usage |
|---------|-----------|-------------|-------------|-------|-------|
| **Post Title** | `text-5xl` (48px) | `leading-tight` (1.2) | `font-bold` (700) | `text-gray-900` | Individual post page |
| **Post Subtitle** | `text-2xl` (24px) | `leading-relaxed` (1.6) | `font-normal` (400) | `text-gray-600` | Individual post page |
| **Post Body** | `text-lg` (18px) | `leading-relaxed` (1.7) | `font-normal` (400) | `text-gray-900` | Paragraph text |
| **H1** | `text-4xl` (36px) | `leading-tight` (1.2) | `font-bold` (700) | `text-gray-900` | Main headings in content |
| **H2** | `text-3xl` (30px) | `leading-snug` (1.3) | `font-bold` (700) | `text-gray-900` | Section headings |
| **H3** | `text-2xl` (24px) | `leading-snug` (1.3) | `font-semibold` (600) | `text-gray-900` | Subsection headings |
| **H4** | `text-xl` (20px) | `leading-snug` (1.3) | `font-semibold` (600) | `text-gray-900` | Minor headings |
| **Blockquote** | `text-xl` (20px) | `leading-relaxed` (1.7) | `font-normal` (400) | `text-gray-700` | Quote text |
| **Code Inline** | `text-base` (16px) | `leading-normal` (1.5) | `font-mono` | `text-gray-900` | Inline code |
| **Code Block** | `text-sm` (14px) | `leading-relaxed` (1.6) | `font-mono` | `text-gray-900` | Code blocks |
| **List Item** | `text-lg` (18px) | `leading-relaxed` (1.7) | `font-normal` (400) | `text-gray-900` | List items |
| **Meta Text** | `text-sm` (14px) | `leading-normal` (1.5) | `font-normal` (400) | `text-gray-500` | Date, author, reading time |

#### Homepage Section

| Element | Font Size | Line Height | Font Weight | Color | Usage |
|---------|-----------|-------------|-------------|-------|-------|
| **Section Title** | `text-4xl` (36px) | `leading-tight` (1.2) | `font-bold` (700) | `text-gray-900` | "Blog / Insights" |
| **Section Subtitle** | `text-lg` (18px) | `leading-relaxed` (1.6) | `font-normal` (400) | `text-gray-600` | Section description |
| **Card Title** | `text-xl` (20px) | `leading-snug` (1.3) | `font-semibold` (600) | `text-gray-900` | Post card title |
| **Card Excerpt** | `text-base` (16px) | `leading-relaxed` (1.6) | `font-normal` (400) | `text-gray-600` | Post card excerpt |
| **Card Date** | `text-sm` (14px) | `leading-normal` (1.5) | `font-normal` (400) | `text-gray-500` | Post card date |

---

## 2. Lists & Bullets

### 2.1 Unordered Lists (Bullet Points)

**Styling**:
```css
ul {
  list-style-type: none; /* Remove default bullets */
  padding-left: 0;
  margin: 1.5rem 0;
}

li {
  position: relative;
  padding-left: 1.75rem; /* Space for custom bullet */
  margin-bottom: 0.75rem;
  line-height: 1.7;
}

li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #3b82f6; /* blue-600 */
  font-size: 1.5rem;
  line-height: 1.7;
  font-weight: 700;
}
```

**Tailwind Classes**:
```tsx
<ul className="my-6 space-y-3">
  <li className="relative pl-7 text-lg leading-relaxed text-gray-900 before:absolute before:left-0 before:text-blue-600 before:text-2xl before:font-bold before:leading-relaxed">
    List item content
  </li>
</ul>
```

**Alternative (Simpler)**:
```tsx
<ul className="my-6 list-disc list-inside space-y-3 text-lg leading-relaxed text-gray-900">
  <li>List item content</li>
</ul>
```

**Bullet Color**: `text-blue-600` (matches DestExplore accent)
**Bullet Size**: Slightly larger than text (1.5rem / 24px)
**Spacing**: 0.75rem (12px) between items

---

### 2.2 Ordered Lists (Numbered)

**Styling**:
```css
ol {
  list-style-type: decimal;
  padding-left: 1.75rem;
  margin: 1.5rem 0;
}

ol li {
  padding-left: 0.5rem;
  margin-bottom: 0.75rem;
  line-height: 1.7;
}
```

**Tailwind Classes**:
```tsx
<ol className="my-6 list-decimal list-inside space-y-3 text-lg leading-relaxed text-gray-900">
  <li className="pl-2">First item</li>
  <li className="pl-2">Second item</li>
</ol>
```

**Number Color**: `text-gray-900` (same as text)
**Number Style**: Decimal (1, 2, 3...)
**Spacing**: 0.75rem (12px) between items

---

### 2.3 Nested Lists

**Styling**:
```css
ul ul, ol ol, ul ol, ol ul {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  margin-left: 1.5rem;
}
```

**Tailwind Classes**:
```tsx
<ul className="my-6 space-y-3">
  <li>
    Parent item
    <ul className="mt-3 ml-6 space-y-2">
      <li>Nested item</li>
    </ul>
  </li>
</ul>
```

**Nested Bullet**: Use `circle` for nested unordered lists:
```css
ul ul li::before {
  content: '○';
  font-size: 1rem;
}
```

---

## 3. Content Block Styling

### 3.1 Paragraph Block

```tsx
<p className="text-lg leading-relaxed text-gray-900 my-6">
  Paragraph content with proper spacing and readability.
</p>
```

**Spacing**: `my-6` (1.5rem / 24px) top and bottom margin
**Line Height**: `leading-relaxed` (1.7) for comfortable reading

---

### 3.2 Heading Blocks

#### H1 (Main Heading)
```tsx
<h1 className="text-4xl font-bold text-gray-900 leading-tight mt-8 mb-4">
  Main Heading
</h1>
```

#### H2 (Section Heading)
```tsx
<h2 className="text-3xl font-bold text-gray-900 leading-snug mt-8 mb-4">
  Section Heading
</h2>
```

#### H3 (Subsection Heading)
```tsx
<h3 className="text-2xl font-semibold text-gray-900 leading-snug mt-6 mb-3">
  Subsection Heading
</h3>
```

**Spacing**: 
- Top margin: `mt-8` (2rem) for H1/H2, `mt-6` (1.5rem) for H3
- Bottom margin: `mb-4` (1rem) for H1/H2, `mb-3` (0.75rem) for H3

---

### 3.3 Quote Block

```tsx
<blockquote className="border-l-4 border-blue-600 pl-6 py-4 my-6 bg-blue-50 rounded-r-lg">
  <p className="text-xl leading-relaxed text-gray-700 italic">
    "Quote content here"
  </p>
  {attribution && (
    <cite className="block mt-3 text-sm text-gray-600 not-italic">
      — {attribution}
    </cite>
  )}
</blockquote>
```

**Border**: Left border `border-blue-600`, 4px width
**Background**: Light blue `bg-blue-50`
**Padding**: `pl-6` (1.5rem) left, `py-4` (1rem) top/bottom
**Text**: Italic, larger size (20px)

---

### 3.4 Code Block

```tsx
<pre className="bg-gray-900 text-gray-100 rounded-lg p-6 my-6 overflow-x-auto">
  <code className="text-sm leading-relaxed font-mono">
    {codeContent}
  </code>
</pre>
```

**Background**: Dark gray `bg-gray-900`
**Text**: Light gray `text-gray-100`, monospace font
**Padding**: `p-6` (1.5rem)
**Border Radius**: `rounded-lg`
**Overflow**: Horizontal scroll if needed

---

### 3.5 Inline Code

```tsx
<code className="bg-gray-100 text-gray-900 px-2 py-1 rounded text-base font-mono">
  inline code
</code>
```

**Background**: Light gray `bg-gray-100`
**Padding**: `px-2 py-1` (small padding)
**Border Radius**: `rounded` (small radius)

---

### 3.6 Image Block

```tsx
<figure className="my-8">
  <img
    src={imageUrl}
    alt={altText}
    className="w-full rounded-lg shadow-md"
  />
  {caption && (
    <figcaption className="mt-3 text-sm text-gray-600 text-center italic">
      {caption}
    </figcaption>
  )}
</figure>
```

**Full Width**: `w-full` (breaks out of content width if needed)
**Border Radius**: `rounded-lg`
**Shadow**: `shadow-md` for depth
**Caption**: Centered, italic, smaller text

---

### 3.7 Video Block

```tsx
<div className="my-8 aspect-video rounded-lg overflow-hidden shadow-md">
  <iframe
    src={videoUrl}
    className="w-full h-full"
    allowFullScreen
  />
</div>
```

**Aspect Ratio**: `aspect-video` (16:9)
**Border Radius**: `rounded-lg`
**Shadow**: `shadow-md`

---

### 3.8 Divider Block

```tsx
<hr className="my-8 border-t border-gray-300" />
```

**Color**: `border-gray-300`
**Spacing**: `my-8` (2rem) top and bottom

---

### 3.9 Callout Block

```tsx
<div className="my-6 p-4 rounded-lg border-l-4 bg-blue-50 border-blue-600">
  <p className="text-lg leading-relaxed text-gray-900">
    {content}
  </p>
</div>
```

**Variants**:
- Info: `bg-blue-50 border-blue-600`
- Warning: `bg-yellow-50 border-yellow-600`
- Success: `bg-green-50 border-green-600`

---

## 4. Editor Interface Styling

### 4.1 Editor Container

```tsx
<div className="min-h-screen bg-gray-50">
  <div className="max-w-4xl mx-auto px-6 py-8">
    {/* Editor content */}
  </div>
</div>
```

**Background**: `bg-gray-50` (slightly off-white for focus)
**Max Width**: `max-w-4xl` (896px) - comfortable writing width
**Padding**: `px-6 py-8` (1.5rem horizontal, 2rem vertical)

---

### 4.2 Title Input

```tsx
<input
  type="text"
  className="w-full text-5xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-400 mb-4"
  placeholder="Title"
/>
```

**No Border**: Clean, borderless input
**Placeholder**: Light gray `text-gray-400`

---

### 4.3 Subtitle Input

```tsx
<input
  type="text"
  className="w-full text-2xl font-normal text-gray-600 bg-transparent border-none outline-none placeholder:text-gray-400 mb-8"
  placeholder="Subtitle (optional)"
/>
```

---

### 4.4 Content Block (Editable)

```tsx
<div className="content-block group">
  <div
    contentEditable
    className="text-lg leading-relaxed text-gray-900 outline-none min-h-[1.5rem] py-2 focus:bg-white rounded px-2 -mx-2"
    placeholder="Start writing..."
  />
</div>
```

**Focus State**: Light background `focus:bg-white`
**Min Height**: Ensures block is always visible
**Padding**: `py-2` for comfortable editing

---

### 4.5 Formatting Toolbar

```tsx
<div className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex gap-1">
  <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
    Bold
  </button>
  <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
    Italic
  </button>
  <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded">
    Link
  </button>
</div>
```

**Position**: Absolute, appears on text selection
**Background**: White with shadow
**Buttons**: Hover state `hover:bg-gray-100`

---

## 5. Public Blog Page Styling

### 5.1 Post Container

```tsx
<article className="max-w-3xl mx-auto px-6 py-12">
  {/* Post content */}
</article>
```

**Max Width**: `max-w-3xl` (768px) - optimal reading width
**Padding**: `px-6 py-12` (1.5rem horizontal, 3rem vertical)

---

### 5.2 Post Header

```tsx
<header className="mb-8">
  <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-4">
    {title}
  </h1>
  {subtitle && (
    <p className="text-2xl text-gray-600 leading-relaxed mb-6">
      {subtitle}
    </p>
  )}
  <div className="flex items-center gap-4 text-sm text-gray-500">
    <span>{formatDate(published_at)}</span>
    {reading_time && <span>{reading_time} min citire</span>}
  </div>
</header>
```

---

### 5.3 Featured Image

```tsx
<div className="mb-8 -mx-6">
  <img
    src={featuredImage}
    alt={altText}
    className="w-full h-auto rounded-lg"
  />
</div>
```

**Full Width**: Breaks out of content container (`-mx-6`)

---

## 6. Homepage Section Styling

### 6.1 Section Container

```tsx
<section id="blog" className="bg-white py-20">
  <div className="mx-auto max-w-7xl px-4">
    {/* Section content */}
  </div>
</section>
```

**Background**: White `bg-white`
**Padding**: `py-20` (5rem / 80px) - matches other sections
**Max Width**: `max-w-7xl` (1280px) - matches homepage

---

### 6.2 Post Card

```tsx
<div className="group h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl">
  {/* Image */}
  <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
    <img
      src={featuredImage}
      alt={title}
      className="w-full h-full object-cover transition-transform group-hover:scale-105"
    />
  </div>
  
  {/* Content */}
  <div className="p-6">
    <h3 className="text-xl font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
      {title}
    </h3>
    {excerpt && (
      <p className="text-base text-gray-600 line-clamp-3 mb-4">
        {excerpt}
      </p>
    )}
    <div className="flex items-center justify-between text-sm text-gray-500">
      <span>{formatDate(published_at)}</span>
      {reading_time && <span>{reading_time} min</span>}
    </div>
  </div>
</div>
```

**Hover Effects**:
- Card lifts: `hover:-translate-y-1`
- Shadow increases: `hover:shadow-xl`
- Image scales: `group-hover:scale-105`
- Title color: `group-hover:text-blue-600`

---

## 7. Colors

### 7.1 Text Colors

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| **Primary Text** | `#111827` | `text-gray-900` |
| **Secondary Text** | `#4b5563` | `text-gray-600` |
| **Tertiary Text** | `#6b7280` | `text-gray-500` |
| **Placeholder** | `#9ca3af` | `text-gray-400` |
| **Links** | `#2563eb` | `text-blue-600` |
| **Link Hover** | `#1d4ed8` | `hover:text-blue-700` |

### 7.2 Background Colors

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| **Page Background** | `#ffffff` | `bg-white` |
| **Editor Background** | `#f9fafb` | `bg-gray-50` |
| **Card Background** | `#ffffff` | `bg-white` |
| **Quote Background** | `#eff6ff` | `bg-blue-50` |
| **Code Background** | `#111827` | `bg-gray-900` |
| **Inline Code** | `#f3f4f6` | `bg-gray-100` |

### 7.3 Border Colors

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| **Default Border** | `#d1d5db` | `border-gray-300` |
| **Focus Border** | `#3b82f6` | `border-blue-500` |
| **Quote Border** | `#2563eb` | `border-blue-600` |
| **Divider** | `#d1d5db` | `border-gray-300` |

---

## 8. Spacing

### 8.1 Content Spacing

| Element | Spacing | Tailwind Class |
|---------|---------|----------------|
| **Paragraph Margin** | 1.5rem (24px) | `my-6` |
| **Heading Top Margin** | 2rem (32px) | `mt-8` |
| **Heading Bottom Margin** | 1rem (16px) | `mb-4` |
| **List Margin** | 1.5rem (24px) | `my-6` |
| **List Item Spacing** | 0.75rem (12px) | `space-y-3` |
| **Block Margin** | 2rem (32px) | `my-8` |

### 8.2 Section Spacing

| Element | Spacing | Tailwind Class |
|---------|---------|----------------|
| **Section Padding** | 5rem (80px) | `py-20` |
| **Container Padding** | 1.5rem (24px) | `px-6` |
| **Card Padding** | 1.5rem (24px) | `p-6` |
| **Card Gap** | 2rem (32px) | `gap-8` |

---

## 9. Borders & Shadows

### 9.1 Border Radius

| Element | Radius | Tailwind Class |
|---------|--------|----------------|
| **Cards** | 0.75rem (12px) | `rounded-xl` |
| **Images** | 0.5rem (8px) | `rounded-lg` |
| **Buttons** | 0.5rem (8px) | `rounded-lg` |
| **Inputs** | 0.5rem (8px) | `rounded-lg` |
| **Small Elements** | 0.25rem (4px) | `rounded` |

### 9.2 Shadows

| Element | Shadow | Tailwind Class |
|---------|--------|----------------|
| **Cards** | Medium | `shadow-md` |
| **Cards Hover** | Large | `hover:shadow-xl` |
| **Toolbar** | Large | `shadow-lg` |
| **Images** | Medium | `shadow-md` |

---

## 10. Responsive Design

### 10.1 Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| **Mobile** | < 640px | Single column, full width |
| **Tablet** | 640px - 1024px | 2 columns for cards |
| **Desktop** | > 1024px | 3 columns for cards |

### 10.2 Typography Scaling

**Mobile**:
- Post Title: `text-3xl` (30px)
- Post Body: `text-base` (16px)
- Section Title: `text-3xl` (30px)

**Tablet & Desktop**:
- Post Title: `text-5xl` (48px)
- Post Body: `text-lg` (18px)
- Section Title: `text-4xl` (36px)

---

## 11. Interactive States

### 11.1 Hover States

```tsx
// Links
className="text-blue-600 hover:text-blue-700 underline"

// Buttons
className="bg-blue-600 hover:bg-blue-700 text-white"

// Cards
className="hover:-translate-y-1 hover:shadow-xl transition-all"
```

### 11.2 Focus States

```tsx
// Inputs
className="focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"

// Buttons
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
```

### 11.3 Active States

```tsx
// Buttons
className="active:scale-95 transition-transform"
```

---

## 12. Accessibility

### 12.1 Color Contrast

- **Text on White**: `text-gray-900` (WCAG AAA compliant)
- **Text on Gray**: `text-gray-600` (WCAG AA compliant)
- **Links**: `text-blue-600` (WCAG AA compliant)

### 12.2 Focus Indicators

- All interactive elements have visible focus rings
- Focus ring color: `ring-blue-500`
- Focus ring offset: `ring-offset-2`

### 12.3 Semantic HTML

- Use `<article>` for blog posts
- Use `<header>` for post headers
- Use `<figure>` and `<figcaption>` for images
- Use `<blockquote>` for quotes
- Use proper heading hierarchy (h1 → h2 → h3)

---

## 13. Animation & Transitions

### 13.1 Framer Motion

**Page Transitions**:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>
```

**Card Animations**:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6, delay: index * 0.1 }}
>
```

### 13.2 CSS Transitions

```css
transition-all duration-200 ease-in-out
```

**Common Transitions**:
- Hover effects: `transition-all`
- Color changes: `transition-colors`
- Transform: `transition-transform`

---

## 14. Component Examples

### Complete Paragraph Block

```tsx
<p className="text-lg leading-relaxed text-gray-900 my-6">
  This is a paragraph with <strong className="font-semibold">bold text</strong> and{' '}
  <em className="italic">italic text</em> and{' '}
  <a href="#" className="text-blue-600 hover:text-blue-700 underline">
    a link
  </a>.
</p>
```

### Complete List Block

```tsx
<ul className="my-6 list-disc list-inside space-y-3 text-lg leading-relaxed text-gray-900">
  <li>First item with some content that might wrap to multiple lines</li>
  <li>Second item</li>
  <li>
    Third item with nested list
    <ul className="mt-3 ml-6 list-circle space-y-2">
      <li>Nested item one</li>
      <li>Nested item two</li>
    </ul>
  </li>
</ul>
```

### Complete Quote Block

```tsx
<blockquote className="border-l-4 border-blue-600 pl-6 py-4 my-6 bg-blue-50 rounded-r-lg">
  <p className="text-xl leading-relaxed text-gray-700 italic">
    "This is an inspiring quote that adds value to the content."
  </p>
  <cite className="block mt-3 text-sm text-gray-600 not-italic">
    — Author Name
  </cite>
</blockquote>
```

---

## 15. Implementation Checklist

- [ ] Typography scale defined and implemented
- [ ] List styling (bullets, numbers, nested)
- [ ] Content block styling (paragraphs, headings, quotes, code)
- [ ] Editor interface styling
- [ ] Public blog page styling
- [ ] Homepage section styling
- [ ] Color palette defined
- [ ] Spacing system defined
- [ ] Border radius and shadows defined
- [ ] Responsive breakpoints implemented
- [ ] Hover and focus states
- [ ] Accessibility (contrast, focus indicators)
- [ ] Animations and transitions
- [ ] Dark mode support (if needed)

---

**Status**: Complete ✅  
**Last Updated**: 2025-01-XX

