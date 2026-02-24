"use client"

import Image from 'next/image'
import Link from 'next/link'
import { Bell, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            className={cn('lg:hidden', !onMenuClick && 'hidden')}
          >
            <Menu className="h-5 w-5 text-slate-500" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Wednesday, 16 Oct 2025</p>
            <p className="text-base font-semibold text-slate-900">Good afternoon, Logistics Team</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/notifications" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute right-2 top-2 inline-flex h-2 w-2 rounded-full bg-danger" />
          </Link>
          <div className="hidden items-center gap-3 rounded-full border border-slate-200 px-3 py-1.5 lg:flex">
            <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-200">
              <Image src="https://i.pravatar.cc/100?img=32" alt="Profile" width={36} height={36} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Greater Accra Regional Blood Bank</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="hidden lg:inline-flex">
            Switch Role
          </Button>
        </div>
      </div>
    </header>
  )
}
