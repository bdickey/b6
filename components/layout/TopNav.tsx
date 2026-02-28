'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Clock from './Clock'

const TABS = [
  { label: 'Home', href: '/home' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'People', href: '/people' },
  { label: 'Activities', href: '/activities' },
  { label: 'Meals', href: '/meals' },
  { label: 'Admin', href: '/admin' },
]

interface TopNavProps {
  onBenjiOpen: () => void
  onBoomboxToggle: () => void
  boomboxVisible: boolean
}

export default function TopNav({ onBenjiOpen, onBoomboxToggle, boomboxVisible }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Keyboard shortcut #b for Benji Mode
  useEffect(() => {
    let lastKey = ''
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (lastKey === '#' && e.key === 'b') {
        onBenjiOpen()
      }
      lastKey = e.key
      setTimeout(() => { lastKey = '' }, 500)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onBenjiOpen])

  return (
    <nav style={{
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: 44,
    }}>
      {/* Brand */}
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.15em',
        color: 'var(--muted)', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center',
        paddingRight: 24, borderRight: '1px solid var(--border)',
        marginRight: 4, whiteSpace: 'nowrap',
      }}>
        Benji HQ
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
        {TABS.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              style={{
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 600,
                color: active ? 'var(--accent)' : 'var(--mid)',
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '0 16px',
                height: '100%',
                cursor: 'pointer',
                letterSpacing: '0.03em',
                transition: 'color 0.15s, border-color 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--mid)' }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', paddingLeft: 24 }}>
        {/* Boombox toggle */}
        <button
          onClick={onBoomboxToggle}
          title="Toggle boombox"
          style={{
            background: boomboxVisible ? 'var(--accent3)' : 'none',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '3px 8px',
            fontSize: 15,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          📻
        </button>

        {/* Benji Mode button */}
        <button
          onClick={onBenjiOpen}
          title="Benji Mode (#b)"
          style={{
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 3,
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            letterSpacing: '0.02em',
          }}
        >
          🦕 Benji
        </button>

        {/* Clock */}
        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
          <Clock />
        </div>
      </div>
    </nav>
  )
}
