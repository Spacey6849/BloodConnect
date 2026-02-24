import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'
import { DonorDashboard, HospitalDashboard, BloodBankDashboard, NGODashboard } from '@/components/role-dashboards'

export default async function OverviewPage() {
  const token = cookies().get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null

  if (!session) return <div className="p-6 text-slate-600">Please sign in to view your dashboard.</div>

  switch (session.role) {
    case 'donor':
      return <DonorDashboard userId={session.sub} />
    case 'hospital':
      return <HospitalDashboard userId={session.sub} />
    case 'blood-bank':
      return <BloodBankDashboard userId={session.sub} />
    case 'ngo':
      return <NGODashboard userId={session.sub} />
    default:
      return <div className="p-6 text-slate-600">Unsupported role.</div>
  }
}
