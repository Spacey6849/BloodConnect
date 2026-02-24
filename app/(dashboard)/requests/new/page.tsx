import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { NewRequestForm } from './new-request-form.client'

export default async function NewRequestPage() {
  const session = await getCurrentUserFromCookie()
  if (!session?.sub) redirect('/login?next=/requests/new')

  const admin = supabaseAdmin()
  const { data: me } = await admin.from('users').select('role, latitude, longitude').eq('id', session.sub).maybeSingle()
  if (!me || me.role !== 'hospital') redirect('/requests')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">New Emergency Request</h1>
      <Suspense>
        <NewRequestForm hospitalLat={me.latitude ?? undefined} hospitalLng={me.longitude ?? undefined} />
      </Suspense>
    </div>
  )
}
