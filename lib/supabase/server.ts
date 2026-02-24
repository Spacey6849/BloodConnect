import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined

export function supabaseAdmin() {
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for admin operations')
  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      get() { return undefined },
      set() { /* no-op on server admin */ },
      remove() { /* no-op on server admin */ }
    }
  })
}

export async function getCurrentUserFromCookie() {
  const token = cookies().get(SESSION_COOKIE)?.value
  return token ? await verifySession(token) : null
}
