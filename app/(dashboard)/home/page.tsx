'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import WeatherModule from '@/components/home/WeatherModule'
import HeroSection from '@/components/home/HeroSection'

interface UpcomingItem {
  date: string
  title: string
  color: string
}

interface AppSetting {
  key: string
  value: string
}

interface SitterBooking {
  id: string
  date: string
  start_time: string
  end_time: string
  total: number
  status: string
  sitters?: { name: string }
}

function EditStat({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  if (editing) return (
    <input
      autoFocus value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => { onSave(v); setEditing(false) }}
      onKeyDown={e => e.key === 'Enter' && (onSave(v), setEditing(false))}
      style={{ width: 90, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, textAlign: 'right', background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 2, padding: '1px 4px', color: 'var(--text)', outline: 'none' }}
    />
  )
  return (
    <span
      onClick={() => setEditing(true)}
      style={{ fontWeight: 700, cursor: 'text', borderBottom: '1px dashed var(--border)' }}
      title="Click to edit"
    >{value}</span>
  )
}

export default function HomePage() {
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [nextBooking, setNextBooking] = useState<SitterBooking | null>(null)
  const [placesCount, setPlacesCount] = useState(0)
  const [activitiesCount, setActivitiesCount] = useState(0)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const today = new Date().toISOString().split('T')[0]
    const twoMonths = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [evRes, feRes, settRes, bkRes, plRes, acRes] = await Promise.all([
      supabase.from('calendar_events').select('date,title,type').gte('date', today).lte('date', twoMonths),
      supabase.from('family_events').select('date,name').gte('date', today).lte('date', twoMonths),
      supabase.from('app_settings').select('*'),
      supabase.from('sitter_bookings').select('*, sitters(name)').gte('date', today).order('date').limit(1),
      supabase.from('places_visited').select('id').limit(100),
      supabase.from('afterschool_programs').select('id').eq('status', 'enrolled').limit(100),
    ])

    // Merge and sort upcoming items
    const items: UpcomingItem[] = []
    if (evRes.data) evRes.data.forEach(e => items.push({
      date: e.date, title: e.title,
      color: e.type === 'red' ? 'var(--accent2)' : e.type === 'gold' ? 'var(--accent3)' : 'var(--accent)',
    }))
    if (feRes.data) feRes.data.forEach(e => items.push({
      date: e.date, title: e.name, color: 'var(--accent3)',
    }))
    items.sort((a, b) => a.date.localeCompare(b.date))
    setUpcoming(items.slice(0, 8))

    if (settRes.data) {
      const map: Record<string, string> = {}
      settRes.data.forEach((s: AppSetting) => { map[s.key] = s.value })
      setSettings(map)
    }
    if (bkRes.data && bkRes.data.length > 0) setNextBooking(bkRes.data[0])
    if (plRes.data) setPlacesCount(plRes.data.length)
    if (acRes.data) setActivitiesCount(acRes.data.length)
  }

  async function updateSetting(key: string, value: string) {
    await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' })
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const dayOfYear = Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  const daysInYear = today.getFullYear() % 4 === 0 ? 366 : 365

  const benjiDob = settings['benji_dob'] || '2018-04-14'
  const dob = new Date(benjiDob)
  const nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
  if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1)
  const daysUntilBday = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const quickLinks: Array<{ label: string; url: string }> = settings['quick_links']
    ? JSON.parse(settings['quick_links'])
    : [
        { label: 'School Loop', url: '#' },
        { label: 'ParentSquare', url: '#' },
        { label: 'After-School Signup', url: '#' },
        { label: 'Dropbox: Family Docs', url: '#' },
      ]

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div>
      <HeroSection />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>

        {/* Weather */}
        <WeatherModule />

        {/* Day of Year */}
        <div className="card" style={{ padding: 16 }}>
          <div className="module-label" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Day of Year
          </div>
          <div style={{ fontSize: 80, fontWeight: 900, lineHeight: 0.85, color: 'var(--text)', letterSpacing: '-0.04em' }}>
            {dayOfYear}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 10 }}>
            of {daysInYear} — {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Upcoming Events
          </div>
          {upcoming.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>No upcoming events</div>
          ) : (
            upcoming.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: ev.color, whiteSpace: 'nowrap', minWidth: 42 }}>
                  {formatDate(ev.date)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.35 }}>{ev.title}</span>
              </div>
            ))
          )}
        </div>

        {/* Quick Links */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Quick Links
          </div>
          {quickLinks.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--mid)', textDecoration: 'none' }}>
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>→</span>
              {link.label}
            </a>
          ))}
        </div>

        {/* Benji Stats — all values inline-editable */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Benji Stats <span style={{ fontSize: 9, color: 'var(--border)', fontWeight: 400, letterSpacing: 0, textTransform: 'none', marginLeft: 4 }}>click values to edit</span>
          </div>
          {[
            { key: 'Age', settingKey: 'benji_age', val: settings['benji_age'] || '6' },
            { key: 'Grade', settingKey: 'benji_grade', val: settings['benji_grade'] || '1st' },
            { key: 'School', settingKey: 'benji_school', val: settings['benji_school'] || 'Lincoln Elem' },
            { key: 'Birthday', settingKey: 'benji_dob', val: settings['benji_dob'] || '2018-04-14' },
          ].map(row => (
            <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 500 }}>{row.key}</span>
              <EditStat value={row.val} onSave={v => updateSetting(row.settingKey, v)} />
            </div>
          ))}
          {[
            { key: 'Places Visited', val: String(placesCount), color: 'var(--accent)' },
            { key: 'Activities', val: String(activitiesCount), color: 'var(--text)' },
            { key: 'Days until B-Day', val: String(daysUntilBday), color: 'var(--accent3)' },
          ].map(row => (
            <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 500 }}>{row.key}</span>
              <span style={{ fontWeight: 700, color: row.color }}>{row.val}</span>
            </div>
          ))}
        </div>

        {/* Next Sitter */}
        <div className="card" style={{ padding: 16, position: 'relative', minHeight: 120 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Next Sitter
          </div>
          {nextBooking ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                {(nextBooking.sitters as any)?.name || 'TBD'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.6 }}>
                {formatDate(nextBooking.date)}<br />
                {nextBooking.start_time} – {nextBooking.end_time}
              </div>
              {nextBooking.total > 0 && (
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)', position: 'absolute', bottom: 16, right: 16 }}>
                  ${nextBooking.total}
                </div>
              )}
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>No bookings scheduled</div>
          )}
        </div>

      </div>
    </div>
  )
}
