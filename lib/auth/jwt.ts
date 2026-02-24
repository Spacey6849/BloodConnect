import { SignJWT, jwtVerify } from 'jose'

const SESSION_COOKIE = 'session'
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

type JwtPayload = {
  sub: string
  email: string
  role: 'donor' | 'hospital' | 'blood-bank' | 'ngo'
}

function getSecretKey() {
  const secret = process.env.AUTH_JWT_SECRET
  if (!secret) throw new Error('Missing AUTH_JWT_SECRET')
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: JwtPayload, maxAgeSec = DEFAULT_MAX_AGE) {
  const key = getSecretKey()
  const jwt = await new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setSubject(payload.sub)
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(key)
  return jwt
}

export async function verifySession(token: string): Promise<JwtPayload | null> {
  try {
    const key = getSecretKey()
    const { payload, protectedHeader } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    return { sub: (payload.sub as string)!, email: payload.email as string, role: payload.role as any }
  } catch {
    return null
  }
}

export function cookieOptions(maxAgeSec = DEFAULT_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec
  }
}

export { SESSION_COOKIE }
