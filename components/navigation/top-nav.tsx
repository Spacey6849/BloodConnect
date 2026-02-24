"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Droplet, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type NavItem = { name: string; href: string }

const navItems: NavItem[] = [
  { name: 'Overview', href: '/overview' },
  { name: 'Inventory', href: '/inventory' },
  { name: 'Donors', href: '/donors' },
  { name: 'Requests', href: '/requests' },
  { name: 'Map', href: '/map' },
  { name: 'Camps', href: '/camps' },
  { name: 'History', href: '/history' },
  { name: 'Community', href: '/community' },
  { name: 'Resources', href: '/resources' }
]

type Props = { userName?: string; userRole?: string }

export function TopNav({ userName, userRole }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  async function onLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.replace('/login')
    }
  }

  return (
  <div className="fixed top-3 sm:top-4 left-1/2 z-[2000] -translate-x-1/2 w-[96%] sm:w-[min(1152px,92%)] pointer-events-none">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-transparent to-emerald-400/10 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity" />
  <nav className="pointer-events-auto relative flex items-center justify-between gap-3 sm:gap-5 rounded-full px-5 sm:px-6 h-14 backdrop-blur-2xl border bg-white/90 supports-[backdrop-filter]:bg-white/75 dark:bg-neutral-900/80 supports-[backdrop-filter]:dark:bg-neutral-900/70 border-gray-200/70 dark:border-neutral-700/70 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_28px_-10px_rgba(0,0,0,0.80)]">
          <Link href="/overview" className="flex items-center gap-2 font-semibold tracking-tight text-[15px] select-none">
            <span className="flex h-7 w-7 items-center justify-center  bg-gradient-to-br from-rose-500 to-amber-400 text-white shadow-inner">
              <Droplet className="h-4 w-4" />
            </span>
            <span className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 dark:from-primary dark:via-primary/80 dark:to-primary/60 bg-clip-text text-transparent drop-shadow-sm">BloodConnect</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 md:gap-2">
            {(() => {
              // Role-based visibility: hide Inventory for everyone except blood-bank; donors also hide Requests
              const items = navItems
                .concat(userRole === 'donor' ? [{ name: 'Donate', href: '/donate' }] : [])
                .filter(n => {
                if (userRole !== 'blood-bank' && n.href === '/inventory') return false
                // Hide Donors tab for donor role
                if (userRole === 'donor' && n.href === '/donors') return false
                if (userRole === 'donor' && n.href === '/requests') return false
                if (userRole !== 'donor' && n.href === '/resources') return false
                return true
              })
              return items.map(item => {
              const active = pathname === item.href || (item.href !== '/overview' && pathname?.startsWith(item.href))
              const base = 'relative px-3 py-2 text-sm font-medium  transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
              const activeClasses = 'text-gray-900 dark:text-white bg-white/70 dark:bg-white/10 border border-emerald-500/40 dark:border-emerald-400/35 shadow-inner ring-1 ring-emerald-500/15 dark:ring-emerald-400/20'
              const normal = 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              return (
                <Link key={item.href} href={item.href} className={`${base} ${active ? activeClasses : normal}`} prefetch={false}>
                  {item.name}
                </Link>
              )
              })
            })()}
          </div>
          <div className="flex items-center gap-2">
            {userName ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="inline-flex max-w-[180px] items-center gap-2 rounded-full border border-transparent bg-black/5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-black/10 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15"
                >
                  <span className="truncate">{userName}</span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-lg ring-1 ring-black/5 dark:border-neutral-700/70 dark:bg-neutral-900">
                    <Link
                      href="/dashboard/profile"
                      className="block w-full px-3 py-2 text-sm text-gray-700 hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
                      onClick={() => setOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="rounded-full border border-transparent px-3 py-1.5 text-sm text-gray-700 hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10">Sign in</Link>
            )}
          </div>
        </nav>
      </div>
    </div>
  )
}
