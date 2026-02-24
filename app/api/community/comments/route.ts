import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookie, supabaseAdmin } from '@/lib/supabase/server'

// GET /api/community/comments?postId=<id>&limit=50&cursor=<iso>
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const postId = url.searchParams.get('postId')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100)
    const cursor = url.searchParams.get('cursor')

    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

    const admin = supabaseAdmin()
    let query = admin
      .from('v_community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) query = query.lt('created_at', cursor)

  const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load comments' }, { status: 500 })
  }
}

// POST /api/community/comments
// body: { post_id: string, content: string }
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUserFromCookie()
    if (!session?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const post_id = String(body.post_id || '')
    const content = String(body.content || '').trim()

    if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 })
    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

    const admin = supabaseAdmin()
    const { data: post, error: pErr } = await admin
      .from('community_posts')
      .select('id')
      .eq('id', post_id)
      .maybeSingle()
    if (pErr) throw pErr
    if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 })

    const { data, error } = await admin
      .from('community_comments')
      .insert({ post_id, author_id: session.sub, content })
      .select('*')
      .single()
    if (error) throw error

    const { data: vrow } = await admin
      .from('v_community_comments')
      .select('*')
      .eq('id', data.id)
      .maybeSingle()

    return NextResponse.json({ comment: vrow || data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create comment' }, { status: 500 })
  }
}
