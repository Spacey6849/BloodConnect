import type { ReactNode } from 'react'
import { TopNav } from '@/components/navigation/top-nav'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let userName: string | undefined
  let userRole: string | undefined
  try {
    const session = await getCurrentUserFromCookie()
    if (session?.sub) {
      const admin = supabaseAdmin()
      const { data } = await admin.from('users').select('name, email, role').eq('id', session.sub).maybeSingle()
      userName = data?.name || data?.email || undefined
      userRole = data?.role || undefined
    }
  } catch {
    // ignore and render without name
  }
  return (
    <div className="min-h-screen bg-slate-100">
      <TopNav userName={userName} userRole={userRole} />
  <main className="relative z-0 mx-auto w-full max-w-7xl px-4 pt-24 pb-16">{children}</main>
    </div>
  )
}
