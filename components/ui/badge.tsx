import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'outline'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-100',
  success: 'bg-green-50 text-success ring-1 ring-inset ring-green-100',
  warning: 'bg-amber-50 text-warning ring-1 ring-inset ring-amber-100',
  danger: 'bg-red-50 text-danger ring-1 ring-inset ring-red-100',
  outline: 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200'
}

export function Badge({ className, variant = 'default', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variantStyles[variant], className)}
      {...props}
    />
  )
}
