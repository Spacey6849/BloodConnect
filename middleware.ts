import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const payload = token ? await verifySession(token) : null
  const isAuthed = !!payload

  const { pathname } = req.nextUrl
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const protectedRoots = ['/dashboard', '/overview', '/requests', '/inventory', '/donors', '/map', '/camps', '/impact']
  const isProtected = protectedRoots.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!isAuthed && isProtected) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    // Preserve original path and query so we can navigate back after login
    const original = req.nextUrl.clone()
    const originalPath = original.pathname
    const originalQuery = original.search
    const nextValue = originalQuery ? `${originalPath}${originalQuery}` : originalPath
    url.searchParams.set('next', nextValue)
    return NextResponse.redirect(url)
  }

  if (isAuthed && isAuthRoute) {
    const url = req.nextUrl.clone()
    url.pathname = '/overview'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/overview/:path*', '/requests/:path*', '/inventory/:path*', '/donors/:path*', '/map/:path*', '/camps/:path*', '/impact/:path*', '/login', '/signup']
}
