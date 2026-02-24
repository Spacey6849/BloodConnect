"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { Droplet, Gauge, MapPin, ShieldCheck, Users } from 'lucide-react'

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: Gauge },
  { label: 'Inventory', href: '/dashboard/blood-bank/inventory', icon: Droplet },
  { label: 'Donors', href: '/dashboard/blood-bank/donors', icon: Users },
  { label: 'Requests', href: '/dashboard/hospital/requests', icon: ShieldCheck },
  { label: 'Map', href: '/map', icon: MapPin }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/90 px-4 py-6 backdrop-blur lg:block">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
          <Droplet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-primary-700">Smart Blood Connect</p>
          <p className="text-xs text-slate-500">Realtime readiness dashboard</p>
        </div>
      </div>
      <nav className="mt-8 space-y-2">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-700')} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
