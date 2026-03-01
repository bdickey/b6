'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TravelMap from '@/components/activities/TravelMap'

interface NominatimResult {
  place_id: number
  name: string
  display_name: string
  type: string
  class: string
  address?: { state?: string; country?: string; country_code?: string }
}

function detectPlaceType(item: NominatimResult): string {
  const cc = (item.address?.country_code || 'us').toLowerCase()
  if (cc !== 'us') return 'intl'
  if (item.type === 'beach') return 'beach'
  if (item.class === 'natural' || ['park', 'nature_reserve', 'national_park', 'forest', 'wood', 'coastline'].includes(item.type)) return 'nature'
  return 'city'
}

function PlaceSearch({ onSelect }: { onSelect: (name: string, type: string) => void }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleInput(val: string) {
    setQuery(val)
    if (timer.current) clearTimeout(timer.current)
    if (!val.trim()) { setSuggestions([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&addressdetails=1&featuretype=city,town,village,country`,
          { headers: { 'Accept-Language': 'en-US,en' } }
        )
        const data: NominatimResult[] = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
      } catch {}
      setLoading(false)
    }, 400)
  }

  function selectResult(item: NominatimResult) {
    setOpen(false); setSuggestions([]); setQuery('')
    onSelect(item.name, detectPlaceType(item))
  }

  function getSubtext(item: NominatimResult) {
    const parts = [item.address?.state, item.address?.country].filter(Boolean)
    return parts.join(', ')
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input ref={inputRef} value={query} onChange={e => handleInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); setQuery('') }
          if (e.key === 'Enter' && query.trim() && suggestions.length === 0) { onSelect(query.trim(), 'city'); setQuery('') }
        }}
        placeholder="Search city, beach, park…"
        style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--accent)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }}
      />
      {loading && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--muted)' }}>…</span>}
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--white)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 3px 3px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 220, overflowY: 'auto' }}>
          {suggestions.map(s => (
            <div key={s.place_id} onMouseDown={e => { e.preventDefault(); selectResult(s) }}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,122,75,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{getSubtext(s)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Activity {
  id: string
  name: string
  location?: string
  category: string
  badge?: string
  badge_type?: string
  notes?: string
  sort_order: number
}

interface PlaceVisited {
  id: string
  name: string
  type: string
  year?: number
}


const CATEGORIES = ['travel', 'local', 'museum', 'outdoors']
const CAT_LABELS: Record<string, string> = { travel: '✈️ Travel', local: '📍 Local LA', museum: '🏛 Museums', outdoors: '🌲 Outdoors' }
const PLACE_TYPES = ['home', 'city', 'beach', 'nature', 'intl']
const PLACE_TYPE_ICONS: Record<string, string> = { home: '🏠', city: '🏙', beach: '🏖', nature: '🌲', intl: '🌍' }
const PLACE_TYPE_COLORS: Record<string, string> = { home: 'badge-gray', city: 'badge-gold', beach: 'badge-green', nature: 'badge-green', intl: 'badge-gold' }

function EditCell({ value, onSave }: { value?: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value || '')
  if (editing) return (
    <input className="inline-input" autoFocus value={v} onChange={e => setV(e.target.value)}
      onBlur={() => { onSave(v); setEditing(false) }}
      onKeyDown={e => e.key === 'Enter' && (onSave(v), setEditing(false))}
    />
  )
  return <span onClick={() => setEditing(true)} style={{ cursor: 'text', minWidth: 40, display: 'inline-block' }}>{value || <span style={{ color: 'var(--border)' }}>—</span>}</span>
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [places, setPlaces] = useState<PlaceVisited[]>([])
  const [searchingPlace, setSearchingPlace] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [a, p] = await Promise.all([
      supabase.from('activities_wishlist').select('*').order('sort_order').order('name'),
      supabase.from('places_visited').select('*').order('year', { ascending: false }).order('name'),
    ])
    if (a.data) setActivities(a.data)
    if (p.data) setPlaces(p.data)
  }

  async function addActivity(category: string) {
    await supabase.from('activities_wishlist').insert({ name: 'New Activity', category, sort_order: 0 })
    loadAll()
  }

  async function updateActivity(id: string, field: string, value: string) {
    await supabase.from('activities_wishlist').update({ [field]: value }).eq('id', id)
    loadAll()
  }

  async function deleteActivity(id: string) {
    await supabase.from('activities_wishlist').delete().eq('id', id)
    loadAll()
  }

  async function addPlaceFromSearch(name: string, type: string) {
    await supabase.from('places_visited').insert({ name, type })
    setSearchingPlace(false)
    loadAll()
  }

  async function updatePlace(id: string, field: string, value: string) {
    await supabase.from('places_visited').update({ [field]: value }).eq('id', id)
    loadAll()
  }

  async function deletePlace(id: string) {
    await supabase.from('places_visited').delete().eq('id', id)
    loadAll()
  }

  function cycleType(current: string): string {
    const idx = PLACE_TYPES.indexOf(current)
    return PLACE_TYPES[(idx + 1) % PLACE_TYPES.length]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Wishlist by category */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="section-label">Activities Wishlist</div>
        </div>
        {CATEGORIES.map(cat => {
          const items = activities.filter(a => a.category === cat)
          return (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{CAT_LABELS[cat]}</div>
                <button onClick={() => addActivity(cat)}
                  style={{ fontFamily: 'inherit', fontSize: 10, color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '3px 8px', cursor: 'pointer', borderRadius: 2 }}>+ Add</button>
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {items.map(a => (
                  <div key={a.id} className="card" style={{ padding: '12px 14px', minWidth: 160, flexShrink: 0, position: 'relative' }}>
                    <button
                      onClick={() => deleteActivity(a.id)}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }}
                    >×</button>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4, paddingRight: 14 }}>
                      <EditCell value={a.name} onSave={v => updateActivity(a.id, 'name', v)} />
                      {a.badge && <span className={`badge ${a.badge_type === 'green' ? 'badge-green' : a.badge_type === 'gold' ? 'badge-gold' : 'badge-gray'}`} style={{ marginLeft: 6 }}>{a.badge}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      <EditCell value={a.location} onSave={v => updateActivity(a.id, 'location', v)} />
                    </div>
                    {a.notes && (
                      <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 4, lineHeight: 1.4 }}>
                        <EditCell value={a.notes} onSave={v => updateActivity(a.id, 'notes', v)} />
                      </div>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>No activities yet</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Places Visited */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div className="section-label">Places Visited</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {places.length} place{places.length !== 1 ? 's' : ''} visited
            </div>
          </div>
          {!searchingPlace && (
            <button onClick={() => setSearchingPlace(true)}
              style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '5px 12px', cursor: 'pointer', borderRadius: 2 }}>
              + Add Place
            </button>
          )}
        </div>

        {/* Map full-width */}
        <div style={{ marginBottom: 16 }}>
          <TravelMap places={places} />
        </div>

        {/* Table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <div className="card">
            {searchingPlace && (
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <PlaceSearch onSelect={addPlaceFromSearch} />
                </div>
                <button onClick={() => setSearchingPlace(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: '0 4px', fontFamily: 'inherit' }}>✕</button>
              </div>
            )}
            <table className="hl-table">
              <thead><tr>
                <th>Place</th>
                <th>Type</th>
                <th>Year</th>
                <th style={{ width: 24 }}></th>
              </tr></thead>
              <tbody>
                {places.map(p => (
                  <tr key={p.id}>
                    <td><EditCell value={p.name} onSave={v => updatePlace(p.id, 'name', v)} /></td>
                    <td>
                      <button
                        onClick={() => updatePlace(p.id, 'type', cycleType(p.type))}
                        className={`badge ${PLACE_TYPE_COLORS[p.type] || 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                        title="Click to cycle type"
                      >
                        {PLACE_TYPE_ICONS[p.type]} {p.type}
                      </button>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                      <EditCell value={p.year ? String(p.year) : ''} onSave={v => updatePlace(p.id, 'year', v)} />
                    </td>
                    <td>
                      <button onClick={() => deletePlace(p.id)} style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
