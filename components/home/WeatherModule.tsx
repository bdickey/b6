'use client'

import { useEffect, useState, useRef } from 'react'

interface GeoResult {
  name: string
  admin1: string
  country: string
  latitude: number
  longitude: number
}

interface WeatherDay {
  date: string
  hi: number
  lo: number
  icon: string
}

const WMO_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌧',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦', 81: '🌧', 82: '⛈',
  95: '⛈', 96: '⛈', 99: '⛈',
}

function wmoIcon(code: number) {
  return WMO_ICONS[code] || '🌡'
}

const DEFAULT_CITY = { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, label: 'Los Angeles, CA' }

export default function WeatherModule() {
  const [city, setCity] = useState(DEFAULT_CITY)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const [weather, setWeather] = useState<WeatherDay[]>([])
  const [loading, setLoading] = useState(true)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchWeather(city.lat, city.lon)
  }, [city])

  async function fetchWeather(lat: number, lon: number) {
    setLoading(true)
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=5`
      const res = await fetch(url)
      const data = await res.json()
      const days: WeatherDay[] = data.daily.time.map((d: string, i: number) => ({
        date: d,
        hi: Math.round(data.daily.temperature_2m_max[i]),
        lo: Math.round(data.daily.temperature_2m_min[i]),
        icon: wmoIcon(data.daily.weather_code[i]),
      }))
      setWeather(days)
    } catch {
      setWeather([])
    }
    setLoading(false)
  }

  function handleInput(val: string) {
    setQuery(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!val.trim()) { setResults([]); setShowDrop(false); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=en&format=json`)
        const data = await res.json()
        setResults(data.results || [])
        setShowDrop(true)
      } catch { setResults([]) }
    }, 350)
  }

  function selectCity(r: GeoResult) {
    setCity({ name: r.name, lat: r.latitude, lon: r.longitude, label: `${r.name}, ${r.admin1 || r.country}` })
    setQuery('')
    setShowDrop(false)
  }

  function dayLabel(d: string, i: number) {
    if (i === 0) return 'Today'
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          Weather — {city.label}
        </div>
        {/* City search */}
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={e => handleInput(e.target.value)}
            placeholder="Search city…"
            style={{
              width: '100%', padding: '5px 8px', fontSize: 11, fontWeight: 600,
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 2,
              color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; setTimeout(() => setShowDrop(false), 200) }}
          />
          {showDrop && results.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--white)', border: '1px solid var(--border)',
              borderTop: 'none', borderRadius: '0 0 2px 2px', zIndex: 200,
            }}>
              {results.map((r, i) => (
                <div key={i}
                  onMouseDown={() => selectCity(r)}
                  style={{ padding: '7px 10px', fontSize: 12, color: 'var(--text)', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,122,75,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {r.name}, {r.admin1 || r.country}
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{r.country}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em' }}>Loading…</div>
      ) : weather.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>Could not load weather</div>
      ) : (
        <div style={{ display: 'flex' }}>
          {weather.map((d, i) => (
            <div key={d.date} style={{
              flex: 1, textAlign: 'center', padding: '10px 4px',
              borderRight: i < weather.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {dayLabel(d.date, i)}
              </div>
              <div style={{ fontSize: 20, margin: '4px 0' }}>{d.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{d.hi}°</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginTop: 1 }}>{d.lo}°</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
