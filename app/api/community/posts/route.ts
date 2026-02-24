import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

// GET /api/community/posts?limit=20&cursor=<iso_date>&nearLat=&nearLng=&radiusMeters=&authorId=&visibility=
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)
  const cursor = url.searchParams.get('cursor') // ISO date for pagination by updated_at
    const authorId = url.searchParams.get('authorId') || undefined
    const visibility = url.searchParams.get('visibility') || undefined
    const nearLat = parseFloat(url.searchParams.get('nearLat') || '')
    const nearLng = parseFloat(url.searchParams.get('nearLng') || '')
    const radiusMeters = parseFloat(url.searchParams.get('radiusMeters') || '0')

    const admin = supabaseAdmin()
    let query = admin
      .from('v_community_posts')
      .select('*')
  .order('updated_at', { ascending: false })
      .limit(limit)

    if (cursor) {
  // simple keyset: updated_at < cursor
  query = query.lt('updated_at', cursor)
    }

    if (authorId) query = query.eq('author_id', authorId)
    if (visibility && ['public','donor','hospital','blood-bank','ngo'].includes(visibility)) {
      query = query.eq('visibility', visibility)
    }

    // Radius filter using RPC would be faster; do a simple filter when lat/lng provided
    if (Number.isFinite(nearLat) && Number.isFinite(nearLng) && Number.isFinite(radiusMeters) && radiusMeters > 0) {
      // Use PostgREST filter via raw SQL not exposed; fallback to client filter after fetch for simplicity
      const { data, error } = await admin
        .from('v_community_posts')
        .select('*')
  .order('updated_at', { ascending: false })
        .limit(200)
      if (error) throw error
      const filtered = (data || []).filter(p => {
        if (p.latitude == null || p.longitude == null) return false
        const R = 6371000
        const toRad = (d: number) => d * Math.PI / 180
        const dLat = toRad(p.latitude - nearLat)
        const dLng = toRad(p.longitude - nearLng)
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(nearLat)) * Math.cos(toRad(p.latitude)) * Math.sin(dLng/2)**2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const dist = R * c
        return dist <= radiusMeters
      }).slice(0, limit)
      return NextResponse.json({ items: filtered })
    }

  const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load posts' }, { status: 500 })
  }
}

// POST /api/community/posts
// body: { content: string, media_url?: string, latitude?: number, longitude?: number, visibility?: 'public'|'donor'|'hospital'|'blood-bank'|'ngo', post_type?: 'request'|'discussion'|'event_update', blood_type?: 'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-' }
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const content = String(body.content || '').trim()
    const media_url = body.media_url ? String(body.media_url) : null
    const latitude = Number.isFinite(body.latitude) ? Number(body.latitude) : null
    const longitude = Number.isFinite(body.longitude) ? Number(body.longitude) : null
    const visibility = ['public','donor','hospital','blood-bank','ngo'].includes(body.visibility) ? body.visibility : 'public'
    const post_type = ['request','discussion','event_update'].includes(body.post_type) ? body.post_type : null
    const blood_type = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].includes(body.blood_type) ? body.blood_type : null

    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })

    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('community_posts')
      .insert({
        author_id: session.sub,
        content,
        media_url,
        latitude,
        longitude,
        visibility,
        post_type,
        blood_type
      })
      .select('*')
      .single()
    if (error) throw error

    // Hydrate author fields for response
    const { data: vrow } = await admin
      .from('v_community_posts')
      .select('*')
      .eq('id', data.id)
      .maybeSingle()

    return NextResponse.json({ post: vrow || data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create post' }, { status: 500 })
  }
}
