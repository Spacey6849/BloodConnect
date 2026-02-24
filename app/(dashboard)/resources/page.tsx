import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'
import { redirect } from 'next/navigation'

type Resource = {
  title: string
  description: string
  youtube_link: string
  category: 'Education' | 'Inspiration' | 'Guide' | 'Wellness' | 'FAQ' | 'Impact'
}

export default async function ResourcesPage() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token || '') : null
  if (!session || session.role !== 'donor') redirect('/overview')
  // Load donor resources (server-side)
  const file = path.join(process.cwd(), 'data', 'resources.json')
  const raw = fs.readFileSync(file, 'utf8')
  const items = JSON.parse(raw) as Resource[]

  const sections = groupIntoSections(items)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Resources</h1>
        <p className="text-sm text-slate-500">Guides, stories, and answers for donors.</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Why Donate?</h2>
        {sections.why.length === 0 ? (
          <Empty>More videos coming soon.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sections.why.map((r, i) => (
              <VideoCard key={i} title={r.title} description={r.description} youtubeUrl={r.youtube_link} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Thank You Stories</h2>
        {sections.stories.length === 0 ? (
          <Empty>More stories coming soon.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sections.stories.map((r, i) => (
              <VideoCard key={i} title={r.title} description={r.description} youtubeUrl={r.youtube_link} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">How to Donate</h2>
        {sections.how.length === 0 ? (
          <Empty>Guides and tips coming soon.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sections.how.map((r, i) => (
              <VideoCard key={i} title={r.title} description={r.description} youtubeUrl={r.youtube_link} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">FAQs</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {sections.faqs.map((r, i) => (
            <VideoCard key={i} title={r.title} description={r.description} youtubeUrl={r.youtube_link} />
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <Faq q="How often can I donate?" a="Whole blood: typically every 56–90 days depending on region and guidance. Check local rules." />
          <Faq q="Is it safe?" a="Yes. Sterile, single-use equipment is used. Staff monitor you throughout the process." />
          <Faq q="What if I feel dizzy?" a="Sit or lie down, hydrate, and inform staff. Symptoms usually resolve quickly." />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Helpful Links</h2>
        <ul className="list-inside list-disc text-sm text-slate-700">
          <li><a className="text-emerald-700 hover:underline" href="https://www.redcrossblood.org/" target="_blank" rel="noreferrer">American Red Cross Blood Services</a></li>
          <li><a className="text-emerald-700 hover:underline" href="https://www.who.int/campaigns/world-blood-donor-day" target="_blank" rel="noreferrer">WHO: World Blood Donor Day</a></li>
          <li><a className="text-emerald-700 hover:underline" href="/camps">Upcoming blood camps</a></li>
          <li>Helpline: <a className="text-emerald-700" href="tel:+18001234567">+1 800 123 4567</a></li>
        </ul>
      </section>
    </div>
  )
}

function groupIntoSections(items: Resource[]) {
  const why = items.filter(r => r.category === 'Education' || r.category === 'Impact')
  const stories = items.filter(r => r.category === 'Inspiration')
  const how = items.filter(r => r.category === 'Guide' || r.category === 'Wellness')
  const faqs = items.filter(r => r.category === 'FAQ')
  return { why, stories, how, faqs }
}

function toYouTubeEmbed(url: string) {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/\//g, '')
      return `https://www.youtube-nocookie.com/embed/${id}`
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`
      // Fallback for other paths like /embed/
      const parts = u.pathname.split('/')
      const idx = parts.findIndex(p => p === 'embed')
      if (idx >= 0 && parts[idx+1]) return `https://www.youtube-nocookie.com/embed/${parts[idx+1]}`
    }
  } catch {}
  return url
}

function VideoCard({ title, description, youtubeUrl }: { title: string; description: string; youtubeUrl: string }) {
  const embed = toYouTubeEmbed(youtubeUrl)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl bg-slate-100">
        <iframe
          className="h-full w-full"
          src={`${embed}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {description && <p className="mt-2 text-sm text-slate-700">{description}</p>}
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="font-medium text-slate-900">{q}</div>
      <div className="mt-1 text-sm text-slate-700">{a}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">{children}</div>
}
