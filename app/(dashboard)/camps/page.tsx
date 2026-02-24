import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'
import { supabaseAdmin } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
const RegisterCamp = dynamic(() => import('./register-camp'), { ssr: false })
const RegisterForCamp = dynamic(() => import('./register-for-camp'), { ssr: false })
const DeleteCampButton = dynamic(() => import('./delete-camp-button.client'), { ssr: false })
import { CampsMap } from '../../../components/map/camps-map'

export default async function CampsPage() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token || '') : null
  const admin = supabaseAdmin()
  const { data: camps } = await admin
    .from('blood_camps')
    .select('id, name, description, address, start_date, end_date, latitude, longitude, organizer_id, capacity_target, registered_count, status')
    .order('start_date', { ascending: true })
  let registrations: Record<string, boolean> = {}
  const isDonor = session?.role === 'donor'
  if (isDonor && camps?.length) {
    const { data: regs } = await admin
      .from('blood_camp_registrations')
      .select('camp_id')
      .eq('user_id', session!.sub)
    registrations = Object.fromEntries((regs || []).map(r => [r.camp_id, true]))
  }

  const canRegister = !!session && ['ngo','hospital'].includes(session.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Blood Camps</h1>
          <p className="text-slate-600">Discover upcoming donation camps and register new ones as an organizer.</p>
        </div>
        {canRegister && <RegisterCamp />}
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          {camps?.length ? camps.map(c => (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{c.name}</h3>
                  <p className="text-sm text-slate-600">{c.description || '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500">{new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}</div>
                  {session?.sub === c.organizer_id && (
                    <DeleteCampButton id={c.id} />
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
                <div>Address: {c.address}</div>
                <div className="flex items-center justify-between">
                  <span>Capacity: {c.capacity_target ?? '—'} • Registered {c.registered_count}</span>
                  {isDonor && (
                    <RegisterForCamp campId={c.id} isRegistered={!!registrations[c.id]} />
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">No upcoming camps.</div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-2">
          <div className="h-[420px] overflow-hidden rounded-xl">
            {(() => {
              const nowIso = new Date().toISOString()
              const active = (camps || []).filter(c => c.end_date >= nowIso && c.status !== 'cancelled')
              return (
                <CampsMap camps={active.map(c => ({ id: c.id, name: c.name, address: c.address, start_date: c.start_date, end_date: c.end_date, lat: c.latitude, lng: c.longitude }))} />
              )
            })()}
          </div>
        </div>
      </section>
    </div>
  )
}
