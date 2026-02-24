import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import type { HTMLAttributes, ReactNode } from 'react'

export function StatsCard({
  title,
  value,
  trend,
  icon,
  description,
  tone = 'neutral',
  ...props
}: {
  title: string
  value: string
  trend?: string
  icon?: ReactNode
  description?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
} & HTMLAttributes<HTMLDivElement>) {
  const accent =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
      ? 'text-warning'
      : tone === 'danger'
      ? 'text-danger'
      : 'text-primary-600'

  return (
    <Card {...props}>
      <CardHeader className="flex items-start gap-3">
        {icon && <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600', accent)}>{icon}</span>}
        <div className="flex-1">
          <CardTitle className="text-sm text-slate-500">{title}</CardTitle>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        {trend && <span className="text-xs font-medium text-success">{trend}</span>}
      </CardHeader>
      {description && (
        <CardContent>
          <CardDescription>{description}</CardDescription>
        </CardContent>
      )}
    </Card>
  )
}
