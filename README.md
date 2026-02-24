# BloodConnect — Smart Blood Availability & Donor Coordination

BloodConnect is a role-based web platform that connects hospitals, blood banks, and donors to coordinate emergency blood needs in real time. It combines geospatial awareness, inventory management, request/fulfillment workflows, blood compatibility guidance, demand forecasting, and multi-channel notifications into a single dashboard-driven application.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript 5 |
| Styling | Tailwind CSS 3, `tailwind-merge`, `clsx` |
| Database | PostgreSQL + PostGIS (geospatial), PL/pgSQL triggers |
| DB client | Supabase JS (`@supabase/supabase-js`, `@supabase/ssr`) |
| Auth | JWT via `jose` + `jsonwebtoken`, `bcryptjs` for password hashing |
| Email | Nodemailer (SMTP) |
| Maps | Leaflet 1.9 + react-leaflet 4 |
| Charts | Apache ECharts 5 (`echarts-for-react`) |
| Data fetching | `@tanstack/react-query` 5 (client-side) |
| Date utilities | `date-fns` 3 |
| Icons | `lucide-react` |

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` in the project root (never committed — see `.gitignore`):

```env
# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Supabase / Postgres
DATABASE_URL=postgres://user:password@host:5432/dbname
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT signing secret
JWT_SECRET=your_long_random_secret

# Mail (Nodemailer — any SMTP provider)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_password
FROM_EMAIL=no-reply@yourdomain.com
```

### 3. Apply database schema

Run the SQL in `db/schema.sql` against your Postgres instance. This creates all tables, indexes, RLS policies, PostGIS functions, and PL/pgSQL triggers. Requires the `postgis` and `pgcrypto` extensions.

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

### 4. Run the app

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve production build
```

> **Windows PowerShell**
> ```powershell
> cd .\webapp; npm install; npm run dev
> ```

> **Build note:** "Dynamic server usage" warnings for API routes that read cookies are expected and harmless.

---

## Project structure

```
app/
  (auth)/          login and signup pages
  (dashboard)/     feature pages: overview, requests, inventory, donors,
                   donate, camps, map, history, community, alerts, resources
  api/             Route Handlers for all backend logic
  dashboard/       Root redirect + profile page
components/
  dashboard/       Stats cards, inventory table, sidebar, navbar, forecast chart
  faq/             Floating FAQ chatbot (client) + rules knowledge base
  impact/          Reusable impact-metrics widget (server component)
  map/             Leaflet wrappers (blood-map, camps-map, map-picker, single-marker)
  navigation/      Pill-shaped floating top nav
  role-dashboards/ Per-role dashboard layouts (hospital / blood-bank / donor / NGO)
  ui/              Primitive components: Button, Card, Badge
db/
  schema.sql       Complete Postgres schema, RLS, triggers, helper functions
lib/
  auth/            JWT sign/verify helpers
  mail/            Nodemailer transport + notification helpers
  push/            Expo push notification client
  supabase/        Server and browser Supabase clients
  utils/           cn (class merging), date formatting
data/
  resources.json   Static resource content for the Resources page
```

---

## Core features by role

### Hospital

- Create and track emergency blood requests (type, units, urgency, location/address).
- View **Recommended Blood Banks** ranked by proximity, current stock, and a composite score.
- Accept a specific bank's response before drawing stock.
- **Use-stock overlay** shows the accepted bank's live inventory:
  - Compatible blood types highlighted in green (compatibility matrix enforced in UI and backend).
  - Incompatible types disabled; backend auto-falls back to compatible types when the primary is unavailable.
- Mark fulfillments as delivered (`delivered_at` recorded, request progress updated).
- Approve the overall request once at least one delivery is confirmed — triggers donation history records and notifications.
- Completed requests hidden by default so the view stays focused on active cases.
- Acknowledge and cancel requests.

### Blood Bank

- Manage inventory (`public.blood_inventory`) per blood type with quantities and expiry dates (bulk upsert supported).
- Respond to hospital requests; inventory decremented atomically, duplicate pending fulfillments merged.
- Receive notifications when a hospital accepts or approves a response.
- Discover nearby donors and **notify them** (in-app + email) without exposing their names on the map.
- View **demand forecasts** — ECharts line/bar charts driven by `/api/forecasts/*` (stored predictions updated by cron).

### Donor

- **Donate page** (donor-only nav item):
  - Auto-detect or use profile location to find nearby banks.
  - Eligibility date check to prevent premature re-donation.
  - Record a donation (units + bank) which feeds the leaderboard.
- **Top Donors leaderboard** sorted by `donationCount` desc, engagement score as tie-breaker.
- Verify donor status (`/api/donors/[id]/verify`, `/api/donors/verify-by-email`).

### NGO / Cross-cutting

- **Donation Camps**: browse, register for, and manage blood donation camps with a Leaflet map view.
- **Community**: posts and comments board for announcements and coordination.
- **Alerts**: create and respond to emergency alerts (`/api/alerts/[id]/respond`).
- **Map view**: shows banks, hospitals, and donors with role-appropriate privacy rules.
- **History**: audit log of significant request and donation events.
- **Resources**: static curated content page (data from `data/resources.json`).
- **Notifications**: in-app records + transactional email via Nodemailer.
- Role-based UI gating throughout — nav items, actions, and pages adapt to the signed-in role.

---

## Impact metrics widget

A server-side React component (`components/impact/impact-widget.tsx`) rendered on every role dashboard. Reads directly from Supabase/Postgres and surfaces:

- Total blood units contributed (`public.donation_history`)
- Active / verified donors (`public.donor_verifications`)
- Emergency request fulfillment rate (`public.emergency_requests`)
- Upcoming donation camps (`public.blood_camps`)

> The standalone `/impact` route still exists but is no longer linked from navigation.

---

## Demand forecasting

`/api/forecasts/*` endpoints compute and store per-bank blood demand predictions:

| Route | Purpose |
|---|---|
| `GET  /api/forecasts/mine` | Fetch forecasts for the signed-in bank |
| `POST /api/forecasts/recompute` | Recompute for the current bank |
| `POST /api/forecasts/recompute-all` | Admin: recompute for all banks |
| `POST /api/forecasts/cron-recompute` | Cron-triggered recompute (call via scheduler) |

Charts rendered with `echarts-for-react` in `components/dashboard/forecast-chart.client.tsx` and `forecast-panel.client.tsx`.

---

## FAQ chatbot

A floating **"Help & FAQ"** button (bottom-right) opens a rules-based chat modal.

- `components/faq/FAQBot.client.tsx` — button and modal UI
- `components/faq/faq-knowledge.ts` — `faqs` array + `findFAQ()` keyword matcher
- Mounted globally in `app/layout.tsx`
- Chat state persisted in `localStorage` (keys prefixed `faqbot:`)
- Keyboard/focus accessible with ARIA labels

---

## Request lifecycle (backend)

- `emergency_requests`: `status` (pending / fulfilled / cancelled), `units_needed`, `units_fulfilled`.
- `request_fulfillments`: per-bank rows with `accepted_by_hospital` and `delivered` flags.
- Key stored procedures (defined in `db/schema.sql`):
  - `decrement_inventory(p_bank_id, p_blood_type, p_units)` — atomic stock update.
  - Delivery trigger: increments `units_fulfilled`, advances status when target met.
  - Approval trigger: writes `donation_history` rows and dispatches notifications.

---

## Blood compatibility matrix

| Recipient type | Can receive from |
|---|---|
| O- | O- |
| O+ | O+, O- |
| A- | A-, O- |
| A+ | A+, A-, O+, O- |
| B- | B-, O- |
| B+ | B+, B-, O+, O- |
| AB- | AB-, A-, B-, O- |
| AB+ | All types |

---

## Key API routes

```
Auth
  POST /api/auth/signup
  POST /api/auth/login
  POST /api/auth/logout
  GET  /api/auth/me
  PUT  /api/auth/profile
  POST /api/auth/send-otp
  POST /api/auth/verify-otp

Requests
  GET  /api/requests
  POST /api/requests
  POST /api/requests/[id]/respond            (bank)
  POST /api/requests/[id]/accept-fulfillment (hospital)
  POST /api/requests/[id]/use-bank           (hospital)
  POST /api/fulfillments/[id]/deliver        (hospital)
  POST /api/requests/[id]/approve            (hospital)
  POST /api/requests/[id]/acknowledge
  POST /api/requests/[id]/cancel
  GET  /api/requests/[id]/fulfillments
  GET  /api/requests/[id]/recommended-banks
  GET  /api/requests/[id]/recommended-donors
  POST /api/requests/[id]/notify-donors
  POST /api/requests/[id]/alerts

Inventory
  GET  /api/inventory/mine
  POST /api/inventory/bulk-upsert
  GET  /api/banks/[id]/inventory

Donors
  GET  /api/nearby/donors
  POST /api/donors/[id]/notify
  POST /api/donors/[id]/verify
  POST /api/donors/verify-by-email
  GET  /api/donations/submissions
  PUT  /api/donations/submissions/[id]

Camps
  GET    /api/camps
  POST   /api/camps
  GET    /api/camps/[id]
  DELETE /api/camps/[id]
  POST   /api/camps/[id]/register

Community
  GET  /api/community/posts
  POST /api/community/posts
  GET  /api/community/comments
  POST /api/community/comments

Nearby
  GET  /api/nearby/banks
  GET  /api/nearby/hospitals
  GET  /api/nearby/donors

Misc
  GET  /api/leaderboard/donors    (public)
  POST /api/donate
  POST /api/alerts/[id]/respond
  GET  /api/forecasts/mine
  POST /api/forecasts/recompute
  POST /api/forecasts/recompute-all
  POST /api/forecasts/cron-recompute
```

---

## Top Donors leaderboard

Served by `GET /api/leaderboard/donors`. Data sources tried in order:

1. `public.donor_engagement_metrics` view (`donations_total_ever` + engagement score).
2. RPC `public.get_top_donors(p_limit)` — aggregates `public.donation_history` by donor.
3. Fallback: `public.users` where `role = 'donor'` ordered by `donation_count`.

DB prerequisites (all included in `db/schema.sql`):

- `public.donor_engagement_metrics` view
- `CREATE INDEX idx_donation_history_donor_id ON public.donation_history(donor_id);`
- `CREATE FUNCTION public.get_top_donors(p_limit integer) RETURNS TABLE(donor_id uuid, donations_count integer)`

Example response:

```json
{
  "donors": [
    { "donorId": "...", "name": "Alice", "bloodType": "O+", "donationCount": 7 },
    { "donorId": "...", "name": "Bob",   "bloodType": "A-", "donationCount": 5 }
  ]
}
```

---

## Security

- Postgres RLS policies on all `public.*` tables (see `db/schema.sql`).
- JWT signed with `JWT_SECRET`; verified server-side via `jose` on every authenticated request.
- Passwords hashed with `bcryptjs` (never stored plain).
- `.env.local` excluded from git via `.gitignore`.
- Donor privacy: names hidden to blood banks on map; contact only via notification/email.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Dynamic server usage" build warnings | Expected for cookie-reading API routes — ignore. |
| Donate page 500 error | Set `NEXT_PUBLIC_BASE_URL` if running behind a reverse proxy. |
| "No inventory found" in use-stock overlay | Ensure `public.blood_inventory` has rows with `quantity > 0` and the correct `blood_bank_id`. |
| Top Donors list empty | Apply `db/schema.sql` fully; add at least one `public.donation_history` row, or set `users.donation_count > 0`. |
| Forecast charts blank | Run `POST /api/forecasts/recompute` once to seed prediction rows. |
| FAQ chat history stuck | Clear `localStorage` keys beginning with `faqbot:` in browser DevTools. |

---

## License

MIT
