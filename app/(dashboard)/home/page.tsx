'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import WeatherModule from '@/components/home/WeatherModule'
import HeroSection from '@/components/home/HeroSection'

interface CalendarEvent {
  id: string
  date: string
  title: string
  type: string
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

export default function HomePage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [nextBooking, setNextBooking] = useState<SitterBooking | null>(null)
  const [placesCount, setPlacesCount] = useState(0)
  const [activitiesCount, setActivitiesCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const twoMonths = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [evRes, settRes, bkRes, plRes, acRes] = await Promise.all([
        supabase.from('calendar_events').select('*').gte('date', today).lte('date', twoMonths).order('date').limit(6),
        supabase.from('app_settings').select('*'),
        supabase.from('sitter_bookings').select('*, sitters(name)').gte('date', today).order('date').limit(1),
        supabase.from('places_visited').select('id').limit(100),
        supabase.from('afterschool_programs').select('id').eq('status', 'enrolled').limit(100),
      ])

      if (evRes.data) setEvents(evRes.data)
      if (settRes.data) {
        const map: Record<string, string> = {}
        settRes.data.forEach((s: AppSetting) => { map[s.key] = s.value })
        setSettings(map)
      }
      if (bkRes.data && bkRes.data.length > 0) setNextBooking(bkRes.data[0])
      if (plRes.data) setPlacesCount(plRes.data.length)
      if (acRes.data) setActivitiesCount(acRes.data.length)
    }
    load()
  }, [])

  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const dayOfYear = Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  const daysInYear = today.getFullYear() % 4 === 0 ? 366 : 365

  const benjiDob = settings['benji_dob'] || '2018-04-14'
  const dob = new Date(benjiDob)
  const nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
  if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1)
  const daysUntilBday = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const quickLinks: Array<{label: string, url: string}> = settings['quick_links']
    ? JSON.parse(settings['quick_links'])
    : [
        { label: 'School Loop', url: '#' },
        { label: 'ParentSquare', url: '#' },
        { label: 'After-School Signup', url: '#' },
        { label: 'Dropbox: Family Docs', url: '#' },
      ]

  function formatDate(d: string) {
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function eventColor(type: string) {
    if (type === 'red') return 'var(--accent2)'
    if (type === 'gold') return 'var(--accent3)'
    return 'var(--accent)'
  }

  return (
    <div>
      <HeroSection />

      {/* Module grid */}
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
          {events.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>No upcoming events</div>
          ) : (
            events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: eventColor(ev.type), whiteSpace: 'nowrap', minWidth: 42 }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--mid)', textDecoration: 'none' }}
            >
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>→</span>
              {link.label}
            </a>
          ))}
        </div>

        {/* Benji Stats */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            Benji Stats
          </div>
          {[
            { key: 'Age', val: settings['benji_age'] || '6' },
            { key: 'Grade', val: settings['benji_grade'] || '1st' },
            { key: 'School', val: settings['benji_school'] || 'Lincoln Elem' },
            { key: 'Places Visited', val: String(placesCount), accent: true },
            { key: 'Activities', val: String(activitiesCount) },
            { key: 'Days until B-Day', val: String(daysUntilBday), accent3: true },
          ].map(row => (
            <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 500 }}>{row.key}</span>
              <span style={{ fontWeight: 700, color: row.accent ? 'var(--accent)' : row.accent3 ? 'var(--accent3)' : 'var(--text)' }}>{row.val}</span>
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
