'use client'

import { useState, useEffect } from 'react'

const TIMEZONES: Record<string, string> = {
  'ET': 'America/New_York',
  'CT': 'America/Chicago',
  'MT': 'America/Denver',
  'PT': 'America/Los_Angeles',
  'GMT': 'Europe/London',
  'CET': 'Europe/Paris',
  'IST': 'Asia/Kolkata',
  'JST': 'Asia/Tokyo',
  'AEST': 'Australia/Sydney',
}

export default function Clock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [tz2, setTz2] = useState<string | null>(null)
  const [time2, setTime2] = useState('')
  const [showTzPicker, setShowTzPicker] = useState(false)

  useEffect(() => {
    function tick() {
      const now = new Date()
      const ptFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      setTime(ptFormatter.format(now))
      setDate(dateFormatter.format(now))

      if (tz2) {
        const tz2Formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: TIMEZONES[tz2],
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        setTime2(tz2Formatter.format(now))
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [tz2])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{time} PT</div>
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{date}</div>
      </div>

      {tz2 && (
        <div style={{ textAlign: 'right', paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mid)' }}>{time2} {tz2}</div>
          <button
            onClick={() => setTz2(null)}
            style={{ fontSize: 9, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            remove
          </button>
        </div>
      )}

      {!tz2 && (
        <button
          onClick={() => setShowTzPicker(!showTzPicker)}
          title="Add timezone"
          style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '1px solid var(--border)',
            background: 'none', cursor: 'pointer',
            fontSize: 11, color: 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
      )}

      {showTzPicker && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 3, zIndex: 200, minWidth: 120, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          {Object.keys(TIMEZONES).map(tz => (
            <button
              key={tz}
              onClick={() => { setTz2(tz); setShowTzPicker(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px', background: 'none', border: 'none',
                fontSize: 12, color: 'var(--text)', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {tz}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
