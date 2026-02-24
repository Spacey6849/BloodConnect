import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'

export function formatRelative(isoDate?: string | null) {
  if (!isoDate) return '—'
  return formatDistanceToNowStrict(parseISO(isoDate), { addSuffix: true })
}

export function formatDate(isoDate?: string | null, pattern: string = 'dd MMM yyyy') {
  if (!isoDate) return '—'
  return format(parseISO(isoDate), pattern)
}

export function formatDateTime(isoDate?: string | null) {
  if (!isoDate) return '—'
  return format(parseISO(isoDate), 'dd MMM yyyy, HH:mm')
}
