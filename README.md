# BloodConnect — Smart Blood Availability & Donor Coordination

BloodConnect is a role-based platform that connects hospitals, blood banks, and donors to coordinate emergency blood needs in real time. It includes geospatial awareness, inventory management, request/fulfillment workflows, compatibility guidance, and notifications.

## Tech stack

- Next.js 14 (App Router), React 18, Tailwind CSS
- PostgreSQL + PostGIS (geospatial), PL/pgSQL triggers/functions
- Supabase client (admin) for database access and RLS policies
- Nodemailer for transactional email
- Leaflet/react-leaflet for maps

## Quick start

1. Install dependencies

```bash
npm install
```

2. Configure environment

Create `.env.local` with (example values):

```env
# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Supabase/Postgres (or your own Postgres endpoint)
DATABASE_URL=postgres://user:password@host:5432/dbname
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Mail (Nodemailer)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_password
FROM_EMAIL=no-reply@yourdomain.com
```

3. Apply database schema

Run the SQL in `db/schema.sql` on your Postgres (creates tables, indexes, RLS, and triggers). Requires PostGIS and pgcrypto extensions.

4. Run the app

```bash
npm run dev
# open http://localhost:3000
```

Build for production:

```bash
npm run build
npm run start
```

Windows PowerShell notes:

```powershell
# From the webapp folder
cd .\webapp\ ; npm install ; npm run dev
# For prod build
cd .\webapp\ ; npm run build ; npm run start
```

Note: During build, some API routes show “Dynamic server usage” warnings because they read cookies (expected for authenticated endpoints).

## Project structure

- `app/`
  - `(dashboard)/` dashboard pages per feature (requests, inventory, donors, donate, etc.)
  - `api/` Route Handlers (authentication, requests lifecycle, inventory, recommendations, donors, etc.)
- `components/` UI building blocks, including `components/map/*`
- `components/impact/impact-widget.tsx` Server component that surfaces Impact metrics on all dashboards
- `components/faq/FAQBot.client.tsx` Floating FAQ button and chat modal (client-side)
- `components/faq/faq-knowledge.ts` Rules-based Q&A used by the FAQ bot
- `db/schema.sql` Complete Postgres schema, RLS, triggers, and helper functions
- `lib/`
  - `supabase/` server utilities for admin client and auth
  - `mail/` Nodemailer transport
- `tailwind.config.ts` Tailwind design tokens and plugins

## Core features by role

### Hospital

- Create and track emergency requests (blood type, units, urgency, location/address).
- See Recommended Blood Banks ranked by proximity, stock, and scoring.
- Approve response (accept) for a specific bank before using its stock.
- Use stock from an accepted bank via an overlay that shows its inventory:
  - Blood type compatibility highlighted (green) based on a compatibility matrix.
  - Incompatible types disabled in UI; backend also auto-falls back to compatible types if the primary is unavailable.
- Mark delivery for fulfillments (records delivered_at, updates request progress).
- Approve overall request after at least one delivery:
  - Triggers record the donation history and send notifications.
- Default request view hides completed ones to focus on active cases.

### Blood Bank

- Manage inventory (`public.blood_inventory`) per blood type with quantities and expiry dates.
- Respond to hospital requests:
  - Inventory is decremented atomically; duplicate pending fulfillments are merged (units combined).
- Get notified when hospital accepts/approves the response.
- Discover nearby donors (recommendations) and notify them:
  - In-app notification + email via Nodemailer.
  - Donor privacy is respected on the map (no names shown to banks).

### Donor

- Donate page (visible only to donor role):
  - Detect location (or use saved profile location) to find nearby blood banks.
  - Check donation eligibility date and availability.
  - Record a donation (units, bank) and contribute to the leaderboard.
- Leaderboard: view Top Donors (server-side fetched via `/api/leaderboard/donors`), showing each donor’s total number of donations. The list is sorted primarily by donation count, with engagement score as a tie-breaker.

### Cross-cutting

- Map view (Leaflet):
  - Shows banks, hospitals, donors with appropriate privacy rules.
  - Banks can “Notify” donors without seeing their names.
- Notifications: in-app records plus email via Nodemailer (configurable SMTP).
- Role-based UI gating and actions throughout the dashboard.
- Donors tab is hidden for donor role in the top navigation.
- Impact metrics are shown on all dashboards via a unified widget (see “Impact metrics widget”).
- A floating FAQ chatbot button appears on every page for quick guidance (see “FAQ chatbot”).

## Impact metrics widget

We migrated the standalone Impact page into a reusable, server-side widget that’s rendered across all dashboards. It connects directly to Supabase/Postgres and shows:

- Total units contributed (aggregated from `public.donation_history`)
- Active/verified donors count (`public.donor_verifications`)
- Emergency request fulfillment rate (`public.emergency_requests`)
- Upcoming donation camps (`public.blood_camps`)

Implementation: `components/impact/impact-widget.tsx`.

Note: The old `/impact` route still exists but is no longer linked from navigation.

## FAQ chatbot

A floating “Help & FAQ” button lives at the bottom-right. Click to open a small chat modal with sample questions and short, rules-based answers.

- Location: `components/faq/FAQBot.client.tsx` (button and modal) and `components/faq/faq-knowledge.ts` (Q&A rules)
- Global mount: included in `app/layout.tsx` so it appears site-wide
- Persistence: chat state and open/closed status are saved in `localStorage`
- Accessibility: keyboard/focus-friendly with ARIA labels; light blue button for visibility
- Customization: edit the `faqs` array or the `findFAQ()` matcher to change answers/keywords

Tip: To reset the chat history, clear `localStorage` keys starting with `faqbot:` in your browser.

## Request lifecycle (backend)

- `emergency_requests` maintain `status` (pending/fulfilled/cancelled), `units_needed`, `units_fulfilled`.
- `request_fulfillments` track bank/hospital actions, `accepted_by_hospital`, and `delivered` state.
- Triggers and helper functions:
  - `decrement_inventory(p_bank_id, p_blood_type, p_units)` ensures atomic stock updates.
  - On delivery, units are added to the request and status advances when met.
  - On approval, delivered fulfillments are written to `donation_history`.
- Activity/history tables record significant events for auditing.

## Compatibility guidance

Compatibility is enforced in the UI and respected by the backend:

- Example matrix used:
  - O− → O−
  - O+ → O+, O−
  - A− → A−, O−
  - A+ → A+, A−, O+, O−
  - B− → B−, O−
  - B+ → B+, B−, O+, O−
  - AB− → AB−, A−, B−, O−
  - AB+ → All types

## Key API routes (sample)

- Auth/session: `/api/auth/*`
- Requests:
  - `POST /api/requests/[id]/respond` (bank-only)
  - `POST /api/requests/[id]/accept-fulfillment` (hospital)
  - `POST /api/requests/[id]/use-bank` (hospital)
  - `POST /api/fulfillments/[id]/deliver` (hospital)
  - `POST /api/requests/[id]/approve` (hospital)
  - `GET  /api/requests/[id]/recommended-banks`
  - `GET  /api/requests/[id]/fulfillments`
- Inventory: `GET /api/banks/[id]/inventory` (hospital)
- Donors: `GET /api/nearby/donors`, `POST /api/donors/[id]/notify`, `POST /api/donors/[id]/verify`
- Leaderboard: `GET /api/leaderboard/donors` (public)

## Top Donors leaderboard

The Donate page shows a “Top Donors” widget sourced from `/api/leaderboard/donors`.

- What it returns: Top donors with their donation counts.
- Sorting: By `donationCount` desc, then by an engagement score (acceptance rate, responsiveness) as tie-breaker.
- Data sources (in order of preference):
  1. `public.donor_engagement_metrics` view (includes `donations_total_ever`).
  2. RPC `public.get_top_donors(p_limit)` which aggregates `public.donation_history` by donor.
  3. Fallback to `public.users` with `role='donor'` ordered by `donation_count`.

DB prerequisites (included in `db/schema.sql`):

- `public.donor_engagement_metrics` view joined to `donation_history` and `donor_alerts`.
- Index to speed up aggregation:
  - `CREATE INDEX idx_donation_history_donor_id ON public.donation_history(donor_id);`
- Optional RPC helper used as a fallback:
  - `CREATE FUNCTION public.get_top_donors(p_limit integer) RETURNS TABLE(donor_id uuid, donations_count integer)`.

Example response shape:

```json
{
  "donors": [
    { "donorId": "…", "name": "Alice", "bloodType": "O+", "donationCount": 7 },
    { "donorId": "…", "name": "Bob", "bloodType": "A-", "donationCount": 5 }
  ]
}
```

## Security and data

- Postgres RLS policies defined in `db/schema.sql` for `public.*` tables.
- Indices and constraints sized for proximity and inventory lookups.
- Donor privacy: names hidden to banks on maps; contact via notification/email only.

## Troubleshooting

- “Dynamic server usage” warnings during build are expected for authenticated API routes that read cookies.
- Donate page server fetch requires an absolute URL. We compute it from headers; set `NEXT_PUBLIC_BASE_URL` if you deploy behind a proxy.
- If Use overlay shows “No inventory found”, ensure the bank has rows in `public.blood_inventory` with `quantity > 0` and correct `blood_bank_id`.

Top Donors shows empty:

- Ensure you’ve applied `db/schema.sql` fully (creates the metrics view, index, and `get_top_donors`).
- Make sure there are users with `role='donor'` in `public.users` (fallback uses this even without history).
- Create at least one row in `public.donation_history` with a non-null `donor_id`, or set `users.donation_count` for initial display.
- The API is public; if calling from the server, forwarding cookies is optional but supported.

## License

MIT
