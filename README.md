# Minzo Africa — Liberia Healthcare Directory

A comprehensive digital directory and discovery platform for healthcare facilities across Liberia, connecting citizens and residents with verified hospitals, clinics, and pharmacies.

---

## Features

- **249+ Healthcare Facilities**: Real-time directory covering hospitals, medical clinics, and licensed pharmacies across all 15 Liberian counties.
- **Search & Filters**: Search by facility name, county, town, service types (`Hospital`, `Clinic`, `Pharmacy`), and patient review ratings.
- **Facility Profiles**: Direct profiles (`/facility/[id]`) showing operating hours, 24/7 emergency readiness, contact details, service specialties, and patient reviews.
- **Groq RAG AI Concierge**: Semantic AI assistant (`/api/rag`) providing plain-text answers strictly grounded in the live facility database with no hallucinated data.
- **Facility Management Dashboard**: Portal for healthcare providers to manage facility hours, staff, and review statuses.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack) & React 19
- **Database & Auth**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`, `@supabase/ssr`)
- **AI / LLM Engine**: [Groq SDK](https://groq.com/) (`openai/gpt-oss-120b`)
- **Styling**: Tailwind CSS & Lucide React

---

## Environment Variables

Configure the following keys in your `.env.local` or deployment settings:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

---

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.
