# Explore OMD Platform

A modular, white-label OMD (Organization Management for Destinations) platform for local destination management.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **AI**: OpenAI GPT-4o mini (translations)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Copy the `.env.local` file and add your keys:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Database Setup

1. Create a new Supabase project
2. Run the SQL migrations from the `/migrations` folder in order
3. Enable Row Level Security (RLS) policies as defined in migrations

## Project Structure

```
explore-omd/
├── app/                    # Next.js app router pages
├── components/             # React components
├── lib/                    # Utility functions and helpers
│   └── supabase/          # Supabase client configuration
├── types/                  # TypeScript type definitions
├── migrations/            # Database migration files
└── public/                # Static assets
```

## Core Features

- 🏨 Multi-tenant OMD management
- 🏢 Business profiles (Hotels, Restaurants, Experiences)
- 📅 Booking & reservation systems
- 🗺️ Interactive maps
- 🌐 Multi-language support with AI translations
- 📧 Email notifications
- 👥 CRM for businesses
- 📊 Admin dashboard
- 🎨 Dynamic, editable content (no hardcoding)

## Deployment

Deploy to Vercel:

```bash
vercel
```

Make sure to add all environment variables in the Vercel dashboard.

## License

Private - All rights reserved

