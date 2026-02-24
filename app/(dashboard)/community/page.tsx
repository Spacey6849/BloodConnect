"use client"

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPicker } from '@/components/map/map-picker'
const SingleMarkerMap = dynamic(() => import('@/components/map/single-marker-map').then(m => m.SingleMarkerMap), { ssr: false })

type Post = {
  id: string
  content: string
  author_name?: string
  author_role?: 'donor'|'hospital'|'blood-bank'|'ngo'
  latitude?: number | null
  longitude?: number | null
  visibility?: 'public'|'donor'|'hospital'|'blood-bank'|'ngo'
  post_type?: 'request'|'discussion'|'event_update' | null
  blood_type?: 'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-' | null
  created_at: string
  updated_at: string
  comment_count?: number
}

export default function CommunityPage() {
  const [query, setQuery] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(initial = false) {
    setError(null)
    if (initial) setLoading(true)
    try {
      const res = await fetch('/api/community/posts?limit=30', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load posts')
      setPosts(Array.isArray(json.items) ? json.items : [])
    } catch (e: any) {
      setError(e.message || 'Failed to load posts')
      setPosts([])
    } finally {
      if (initial) setLoading(false)
    }
  }

  useEffect(() => { load(true) }, [])

  const filtered = useMemo(() => {
    return posts.filter(p => {
      if (query && !p.content.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [posts, query])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Community</h1>
        <p className="text-sm text-slate-500">Share requests, discuss topics, and post event updates across the network.</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600">Search</label>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search posts…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex items-center gap-2">
          <input id="map" type="checkbox" checked={showMap} onChange={e=>setShowMap(e.target.checked)} />
          <label htmlFor="map" className="text-sm text-slate-700">Show map for geo-tagged posts</label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <CreatePost onPosted={() => load()} />
      </div>

      {showMap && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <GeoPostsMap posts={filtered} />
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : error ? (
          <div className="text-sm text-rose-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">No posts yet.</div>
        ) : (
          filtered.map(p => (
            <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <header className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {(p.author_name || '?').slice(0,1).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <div className="text-sm font-semibold text-slate-900">{p.author_name || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{p.author_role}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">{new Date(p.updated_at || p.created_at).toLocaleString()}</div>
              </header>
              {(p.post_type || p.blood_type) && (
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  {p.post_type && (
                    <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      {p.post_type.replace('_',' ')}
                    </span>
                  )}
                  {p.blood_type && (
                    <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                      {p.blood_type}
                    </span>
                  )}
                </div>
              )}
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{p.content}</div>
              {p.latitude != null && p.longitude != null && (
                <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <div className="h-48 w-full">
                    <SingleMarkerMap lat={p.latitude} lng={p.longitude} />
                  </div>
                </div>
              )}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{typeof p.comment_count === 'number' ? `${p.comment_count} comments` : ''}</span>
                </div>
                <CommentsSection key={`${p.id}:${p.comment_count ?? 0}`} postId={p.id} />
                <CreateComment postId={p.id} onPosted={() => load()} />
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}

function CreatePost({ onPosted }: { onPosted: () => void }) {
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState<''|'request'|'discussion'|'event_update'>('')
  const [bloodType, setBloodType] = useState<''|'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-'>('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!content.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          post_type: postType || undefined,
          blood_type: bloodType || undefined,
          latitude: lat ?? undefined,
          longitude: lng ?? undefined,
        })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to post')
  setContent('')
  setPostType('')
  setBloodType('')
  setLat(null)
  setLng(null)
      onPosted()
    } catch (e: any) {
      setError(e.message || 'Failed to post')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-2">
      <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Share a request, discussion, or event update…" rows={3} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Post type (optional)</label>
          <select value={postType} onChange={e=>setPostType(e.target.value as any)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1 text-sm">
            <option value="">—</option>
            <option value="request">Request</option>
            <option value="discussion">Discussion</option>
            <option value="event_update">Event update</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Blood type (optional)</label>
          <select value={bloodType} onChange={e=>setBloodType(e.target.value as any)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1 text-sm">
            <option value="">—</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => (
              <option key={bt} value={bt}>{bt}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="block text-xs font-medium text-slate-600">Location (optional)</label>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" onClick={()=>setPickerOpen(true)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50">Choose on map</button>
            {lat != null && lng != null && (
              <span className="text-xs text-slate-600">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
            )}
            {lat != null && lng != null && (
              <button type="button" onClick={()=>{setLat(null); setLng(null)}} className="text-xs text-slate-500 underline">Clear</button>
            )}
          </div>
        </div>
      </div>
      {lat != null && lng != null && (
        <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
          <div className="h-40 w-full">
            <SingleMarkerMap lat={lat} lng={lng} />
          </div>
        </div>
      )}
      {error && <div className="text-xs text-rose-600">{error}</div>}
      <div className="flex justify-end">
        <button disabled={busy} onClick={submit} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">Post</button>
      </div>
      <MapPicker
        open={pickerOpen}
        onClose={()=>setPickerOpen(false)}
        onSelect={(plat, plng)=>{ setLat(plat); setLng(plng); setPickerOpen(false) }}
        initial={lat!=null&&lng!=null ? { lat, lng } : undefined}
      />
    </div>
  )
}

function CommentsSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)

  async function load() {
    setError(null)
    try {
      const res = await fetch(`/api/community/comments?postId=${encodeURIComponent(postId)}&limit=20`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load comments')
      setComments(Array.isArray(json.items) ? json.items : [])
    } catch (e: any) {
      setError(e.message || 'Failed to load comments')
      setComments([])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [postId])

  if (loading) return <div className="mt-2 text-xs text-slate-500">Loading comments…</div>
  if (error) return <div className="mt-2 text-xs text-rose-600">{error}</div>
  if (comments.length === 0) return null

  return (
    <ul className="mt-2 space-y-2">
      {comments.map(c => (
        <li key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium text-slate-700">{c.author_name ? `${c.author_name} • ${c.author_role}` : ''}</span>
            <span>{new Date(c.created_at).toLocaleString()}</span>
          </div>
          <div className="text-[13px] leading-relaxed text-slate-800">{c.content}</div>
        </li>
      ))}
    </ul>
  )
}

function GeoPostsMap({ posts }: { posts: Post[] }) {
  const DynamicMap = useMemo(() => dynamic(async () => {
    const mod = await import('react-leaflet')
    return function Inner({ markers }: { markers: { lat: number; lng: number; label?: string }[] }) {
      const center = markers.length ? [markers[0].lat, markers[0].lng] as [number, number] : [15.4909, 73.8278] as [number, number]
      return (
        <mod.MapContainer center={center} zoom={markers.length ? 12 : 5} className="h-[360px] w-full rounded-xl" scrollWheelZoom>
          <mod.TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          {markers.map((m, idx) => (
            <mod.Marker key={idx} position={[m.lat, m.lng] as any}>
              <mod.Popup>{m.label || `${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`}</mod.Popup>
            </mod.Marker>
          ))}
        </mod.MapContainer>
      )
    }
  }, { ssr: false }), [])

  const markers = useMemo(() => posts.filter(p => p.latitude != null && p.longitude != null).map(p => ({
    lat: p.latitude as number,
    lng: p.longitude as number,
    label: [p.post_type?.replace('_',' '), p.blood_type, p.author_name].filter(Boolean).join(' • ')
  })), [posts])

  if (!markers.length) return <div className="text-sm text-slate-500">No geo-tagged posts yet.</div>
  return <DynamicMap markers={markers} />
}

function CreateComment({ postId, onPosted }: { postId: string; onPosted: () => void }) {
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit() {
    if (!content.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, content })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to comment')
      setContent('')
      onPosted()
    } catch (e: any) {
      setError(e.message || 'Failed to comment')
    } finally { setBusy(false) }
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <input value={content} onChange={e=>setContent(e.target.value)} placeholder="Write a comment…" className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      <button disabled={busy} onClick={submit} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60">Reply</button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  )
}
