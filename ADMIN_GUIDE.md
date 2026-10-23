# Minzo Africa — Liberia Services Directory: Admin Quick-Start Guide

Welcome to the **Minzo Africa Administrative Console**. This guide outlines how directory administrators manage facility approvals, moderate patient reviews, audit registered users, and inspect provider credentials across Liberia's 15 counties.

---

## 1. Accessing the Admin Console

- **URL**: Navigate to [`/admin`](http://localhost:3000/admin).
- **Access Control**: Only users with the `admin` role in their profile can view the administrative console. Unauthenticated visitors or non-admin accounts are automatically redirected.
- **Top Admin Bar**:
  - Displays your active administrator credentials.
  - **Refresh Data**: Instantly pulls latest submissions and user registrations from Supabase.
  - **View Public Site**: Opens the live citizen-facing directory.
  - **Sign Out**: Securely ends the administrative session.

---

## 2. Core Modules & Workflows

### Module A: Verification Queue (P0 Must-Have)

When a clinic, hospital, or pharmacy registers through [`/auth/register-business`](http://localhost:3000/auth/register-business), its listing enters the **Verification Queue** with status `pending`.

1. Click on the **Verification Queue** tab.
2. Click any facility name to open the **Business Details Dialog**.
3. Inspect the facility specifications and uploaded documentation:
   - **Overview Tab**: Business contact details, physical address, 24/7 emergency readiness, medical services offered, and owner info.
   - **Documents Tab**: Ministry of Health operating permit, registration license number, and uploaded attachment files.
4. Take action:
   - **Approve (Solid Green Button)**: Grants the official **Verified** badge and publishes the facility.
   - **Reject (Red Outline Button)**: Rejects the submission and hides it from public search.

---

### Module B: All Facilities Directory

Allows full administrative oversight across all pre-loaded and registered facilities (249+ healthcare providers nationwide).

- **Search**: Real-time filtering by facility name or town.
- **County Filter**: Filter by any of Liberia's 15 counties (Montserrado, Nimba, Bong, Bomi, Grand Bassa, etc.).
- **Click to Inspect**: Click on any facility name or the document icon to open its full **Business Details Dialog**.
- **Quick Status Toggle**: Instantly toggle verification status between *Verified* and *Unverified*.

---

### Module C: Platform Users Directory

Full directory of all registered profiles across the system.

- **Search**: Search users by full name, email address, or phone number.
- **Role Filtering**: Filter by role:
  - `user`: Public citizens posting reviews, following clinics, or sending messages.
  - `business_owner`: Verified vendors and facility managers with access to the Provider Dashboard.
  - `admin`: Directory moderators with full administrative permissions.
- **Role Assignment**: Use the role dropdown to instantly promote or adjust any user's role. Changes take effect immediately via secure backend endpoints.

---

### Module D: Patient Reviews Moderation

Guarantees fair and trustworthy community feedback while protecting against spam and abusive content.

- **Audit Stream**: Displays all submitted star ratings and written reviews across all facilities.
- **Anonymous Reviews**: While public citizens see "Anonymous", administrators can view the verified author identity for safety auditing.
- **Remove Review**: Click **Delete Review** to permanently remove spam or malicious reviews. The facility's average star rating automatically recalculates immediately.

---

## 3. Best Practices & Moderation Policies

1. **Review Window**: Under the Minzo project specification, only reviews submitted within the rolling 24-month window count toward a facility's public rating.
2. **Document Check**: Verify that the license number or registration document corresponds to an accredited health institution before approving.
3. **Data Integrity**: Never share admin credentials. All database updates are enforced using server-side authenticated calls with PostgreSQL Row Level Security (RLS).
