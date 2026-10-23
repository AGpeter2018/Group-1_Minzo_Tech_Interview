# Minzo Africa — Liberia Services Directory & Reviews Platform

A digital directory and review platform for Liberia, connecting citizens and residents with verified healthcare facilities, hospitals, clinics, and pharmacies across all 15 counties.

---

## 🎯 Deliverables & Key Features

### Core Directory & Citizen Features (P0 Must-Haves)
- **249+ Real Liberian Facilities**: Comprehensive coverage of licensed hospitals, health centers, clinics, and pharmacies across all 15 Liberian counties.
- **Search & "Near Me" Geolocation**: Real-time multi-field search (facility name, keyword, medical specialty, town) and browser Geolocation distance calculations (`km` away) with county fallback.
- **Facility Profiles (`/facility/[id]`)**: Full profiles showing verified/unverified badges, 24/7 emergency readiness, opening hours, medical services, phone numbers with tap-to-call, and website links.
- **Patient Reviews & Ratings**: 1-to-5 star rating and written review submission with an **Anonymous** toggle. Automatic rolling 24-month rating recalculation.
- **Contact Provider**: Direct on-platform messaging storing patient inquiries directly into the facility's inbox.
- **User Profile (`/profile`)**: Dynamic personal dashboard displaying verified user details, review history, and bookmarked facilities with zero hardcoded mock data.
- **RAG AI Concierge**: Semantic assistant powered by Groq (`openai/gpt-oss-120b`) providing instant, grounded healthcare answers strictly from live directory data.

### Business Provider Features (P1 Stretch Items)
- **Business Registration (`/auth/register-business`)**: Dedicated onboarding form for health providers to submit facility information and upload accreditation documents.
- **Provider Dashboard (`/business/dashboard`)**: Vendor management portal to track verification status, review patient inquiries, and monitor reviews.
- **Follow / Bookmarking**: Citizens can bookmark favorite providers and track them on their profile.

### Administrative Moderation Console (P0 Must-Have)
- **Admin Console (`/admin`)**:
  - **Verification Queue**: Review pending facility registrations with 1-click **Approve** and **Reject** actions.
  - **All Facilities Directory**: Nationwide directory oversight with real-time filters, search, and instant verification toggles.
  - **System Users Directory**: Live user list with multi-role filtering (`user`, `business_owner`, `admin`) and real-time role promotion/demotion.
  - **Reviews Moderation**: Comprehensive audit log of all patient reviews with permanent spam/abuse deletion and instant score recalculation.
  - **Business Details Dialog**: Dual-tab modal (*Overview* and *Documents*) matching the designer's Figma layout with facility banner card, key-value rows, document preview, and action buttons.
  - Detailed instructions are in the [Admin Quick-Start Guide](ADMIN_GUIDE.md).

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router, Turbopack) & React 19
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 17 with PostGIS geospatial queries, Row Level Security, Storage)
- **Styling**: Tailwind CSS & Lucide React
- **AI Engine**: Groq SDK (`openai/gpt-oss-120b`) for grounded RAG healthcare concierge

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://spbrsszzhnnbgjismuhr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

---

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Citizen Home: [http://localhost:3000](http://localhost:3000)
   - Search Directory: [http://localhost:3000/search](http://localhost:3000/search)
   - Admin Console: [http://localhost:3000/admin](http://localhost:3000/admin)
   - Business Registration: [http://localhost:3000/auth/register-business](http://localhost:3000/auth/register-business)
   - User Profile: [http://localhost:3000/profile](http://localhost:3000/profile)

---

## 📚 Documentation Links

- [Admin Quick-Start Guide](ADMIN_GUIDE.md): Complete guide for directory moderators and verification teams.
- [Database Public Schema](dataShema.md): Full PostgreSQL schema definition, enums, tables, and PostGIS configuration.
