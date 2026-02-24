import Link from 'next/link'
import {
  Droplet, Activity, MapPin, Bell, BarChart2, Users,
  ShieldCheck, Handshake, Heart, Archive, FlaskConical,
  CalendarDays, MessageSquare, BookOpen, Zap, ArrowRight,
  CheckCircle2
} from 'lucide-react'

const features = [
  {
    icon: Activity,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    title: 'Emergency Request Workflow',
    desc: 'Hospitals raise blood requests with urgency levels and live tracking. Full lifecycle: pending → fulfillment → delivery → approval.',
    roles: ['Hospital', 'Blood Bank'],
  },
  {
    icon: Archive,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    title: 'Inventory Management',
    desc: 'Blood banks manage stock per blood type with expiry dates. Bulk upsert supported. Inventory decremented atomically on fulfillment.',
    roles: ['Blood Bank'],
  },
  {
    icon: MapPin,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    title: 'Geospatial Map',
    desc: 'Leaflet-powered map showing hospitals, blood banks, and donors with role-aware privacy. Banks can notify donors without seeing names.',
    roles: ['All roles'],
  },
  {
    icon: FlaskConical,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    title: 'Blood Compatibility Engine',
    desc: 'Full 8-type compatibility matrix enforced in UI and backend. Incompatible types disabled; backend auto-falls back to compatible alternatives.',
    roles: ['Hospital', 'Blood Bank'],
  },
  {
    icon: BarChart2,
    color: 'text-sky-500',
    bg: 'bg-sky-50',
    title: 'Demand Forecasting',
    desc: 'ECharts-powered forecast charts per blood type. Predictions stored in Postgres and refreshable via cron or manual trigger.',
    roles: ['Blood Bank'],
  },
  {
    icon: Users,
    color: 'text-pink-500',
    bg: 'bg-pink-50',
    title: 'Donor Coordination',
    desc: 'Find nearby donors ranked by proximity. Notify via in-app alerts + email. Leaderboard sorted by donation count and engagement score.',
    roles: ['Blood Bank', 'Donor'],
  },
  {
    icon: Heart,
    color: 'text-red-500',
    bg: 'bg-red-50',
    title: 'Donate & Track',
    desc: 'Donors record donations, check eligibility dates, find nearby banks, and climb the Top Donors leaderboard.',
    roles: ['Donor'],
  },
  {
    icon: CalendarDays,
    color: 'text-teal-500',
    bg: 'bg-teal-50',
    title: 'Donation Camps',
    desc: 'Create, browse, and register for blood donation camps. Each camp shown on an interactive Leaflet map.',
    roles: ['All roles'],
  },
  {
    icon: Bell,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    title: 'Alerts & Notifications',
    desc: 'Emergency alerts with respond actions. In-app notification records plus transactional email delivered via Nodemailer SMTP.',
    roles: ['All roles'],
  },
  {
    icon: Zap,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
    title: 'Impact Metrics Widget',
    desc: 'Server-side widget surfaced on every dashboard — total units contributed, active donors, fulfillment rate, and upcoming camps.',
    roles: ['All roles'],
  },
  {
    icon: MessageSquare,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    title: 'Community Board',
    desc: 'Posts and threaded comments for announcements, coordination, and community engagement across all roles.',
    roles: ['All roles'],
  },
  {
    icon: BookOpen,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50',
    title: 'Resources & FAQ Bot',
    desc: 'Curated resource library plus a floating rules-based FAQ chatbot available on every page. Chat history persisted in localStorage.',
    roles: ['All roles'],
  },
]

const roles = [
  {
    icon: '🏥',
    name: 'Hospital',
    color: 'border-rose-200 bg-rose-50',
    accent: 'text-rose-600',
    items: [
      'Raise emergency blood requests',
      'View ranked recommended blood banks',
      'Accept, deliver, and approve fulfillments',
      'Use-stock overlay with compatibility highlights',
    ],
  },
  {
    icon: '🩸',
    name: 'Blood Bank',
    color: 'border-amber-200 bg-amber-50',
    accent: 'text-amber-600',
    items: [
      'Manage inventory per blood type & expiry',
      'Respond to hospital requests',
      'Forecast demand with ECharts',
      'Discover & notify nearby donors',
    ],
  },
  {
    icon: '💉',
    name: 'Donor',
    color: 'border-emerald-200 bg-emerald-50',
    accent: 'text-emerald-600',
    items: [
      'Find nearby banks and donate',
      'Eligibility date checker',
      'Climb the Top Donors leaderboard',
      'Receive notifications from banks',
    ],
  },
  {
    icon: '🤝',
    name: 'NGO / Admin',
    color: 'border-violet-200 bg-violet-50',
    accent: 'text-violet-600',
    items: [
      'Organise donation camps',
      'Broadcast emergency alerts',
      'Moderate community board',
      'Review donation submissions',
    ],
  },
]

const stats = [
  { label: 'Blood Types Supported', value: '8' },
  { label: 'Compatibility Rules Enforced', value: '8' },
  { label: 'API Endpoints', value: '40+' },
  { label: 'Role Dashboards', value: '4' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-[15px]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-400 text-white">
              <Droplet className="h-4 w-4" />
            </span>
            <span className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 bg-clip-text text-transparent">
              BloodConnect
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-1.5 text-sm text-gray-600 hover:bg-black/5 transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-full bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-700 transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          Real-time blood supply coordination
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
          Connect Hospitals,
          <br />
          <span className="bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 bg-clip-text text-transparent">
            Banks &amp; Donors
          </span>
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-lg text-gray-500">
          BloodConnect is a role-based platform for emergency blood coordination — geospatial awareness, inventory tracking, compatibility guidance, demand forecasting, and multi-channel notifications in one dashboard.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-rose-700 transition-colors">
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            Sign in to dashboard
          </Link>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
              <p className="text-3xl font-extrabold text-gray-900">{s.value}</p>
              <p className="mt-1 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Everything you need</h2>
          <p className="mt-2 text-gray-500">12 integrated modules, purpose-built for blood supply operations</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <div key={f.title} className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.bg} mb-4`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-3">{f.desc}</p>
              <div className="flex flex-wrap gap-1">
                {f.roles.map(r => (
                  <span key={r} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role cards ── */}
      <section className="bg-gray-50 border-y border-gray-200 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Built for every stakeholder</h2>
            <p className="mt-2 text-gray-500">Role-based dashboards adapt to who is signed in</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map(r => (
              <div key={r.name} className={`rounded-2xl border ${r.color} p-6`}>
                <div className="text-3xl mb-3">{r.icon}</div>
                <h3 className={`font-bold text-base mb-3 ${r.accent}`}>{r.name}</h3>
                <ul className="space-y-2">
                  {r.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Tech stack</h2>
          <p className="mt-2 text-gray-500">Modern, production-ready technologies throughout</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            'Next.js 14', 'React 18', 'TypeScript 5', 'Tailwind CSS 3',
            'PostgreSQL + PostGIS', 'Supabase', 'Leaflet / react-leaflet',
            'Apache ECharts', 'TanStack Query', 'Nodemailer', 'jose JWT', 'bcryptjs',
          ].map(t => (
            <span key={t} className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600 shadow-sm">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-br from-rose-600 to-amber-500 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Ready to coordinate smarter?</h2>
        <p className="text-rose-100 mb-8 text-base">Create an account and pick your role to get started.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-rose-600 shadow hover:bg-rose-50 transition-colors">
          Create account
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-400">
        <div className="flex items-center justify-center gap-2 font-semibold text-gray-600 mb-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-400 text-white">
            <Droplet className="h-3 w-3" />
          </span>
          BloodConnect
        </div>
        <p>Built with Next.js, PostgreSQL, and Leaflet. MIT License.</p>
      </footer>
    </div>
  )
}
