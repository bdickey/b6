'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [places, setPlaces] = useState<PlaceVisited[]>([])
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

  async function addPlace() {
    await supabase.from('places_visited').insert({ name: 'New Place', type: 'city' })
    loadAll()
  }

  function badgeEl(badge?: string, badge_type?: string) {
    if (!badge) return null
    const cls = badge_type === 'green' ? 'badge-green' : badge_type === 'gold' ? 'badge-gold' : 'badge-gray'
    return <span className={`badge ${cls}`} style={{ marginLeft: 6 }}>{badge}</span>
  }

  function typeIcon(type: string) {
    const map: Record<string, string> = { home: '🏠', city: '🏙', beach: '🏖', nature: '🌲', intl: '🌍' }
    return map[type] || '📍'
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
                  <div key={a.id} className="card" style={{ padding: '12px 14px', minWidth: 160, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                      {a.name}
                      {badgeEl(a.badge, a.badge_type)}
                    </div>
                    {a.location && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.location}</div>}
                    {a.notes && <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 4, lineHeight: 1.4 }}>{a.notes}</div>}
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
          <button onClick={addPlace}
            style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '5px 12px', cursor: 'pointer', borderRadius: 2 }}>
            + Add Place
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {places.map(p => (
            <div key={p.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{typeIcon(p.type)}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                {p.year && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{p.year}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
