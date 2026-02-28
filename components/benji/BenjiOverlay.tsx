'use client'

import { useState, useEffect } from 'react'
import SpellingGame from './SpellingGame'
import DrawingCanvas from './DrawingCanvas'
import FreeNotepad from './FreeNotepad'

interface Props {
  onClose: () => void
}

type Tab = 'spell' | 'draw' | 'type'

export default function BenjiOverlay({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('spell')
  const [drawingMode, setDrawingMode] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (drawingMode) {
    return <DrawingCanvas onExit={() => setDrawingMode(false)} />
  }

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'spell', label: '✏️ Spell' },
    { id: 'draw', label: '🖍️ Draw' },
    { id: 'type', label: '📝 Type' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 800,
      background: 'var(--white)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Green header */}
      <div style={{
        background: 'var(--accent)', color: '#fff',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', height: 56,
      }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em', flex: 1 }}>
          🦕 Benji Mode
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                padding: '8px 20px',
                background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: 'none', borderRadius: 3,
                color: '#fff', cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >{t.label}</button>
          ))}
        </div>
        {/* Close */}
        <button onClick={onClose}
          style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.15)', border: 'none', padding: '7px 16px', cursor: 'pointer', borderRadius: 3, marginLeft: 24 }}>
          ✕ Exit
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        {tab === 'spell' && <SpellingGame />}
        {tab === 'draw' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20, padding: 40 }}>
            <div style={{ fontSize: 16, color: 'var(--mid)', textAlign: 'center', lineHeight: 1.6 }}>
              Pick up a marker emoji on the home screen and draw anywhere on the page.
            </div>
            <button onClick={() => setDrawingMode(true)}
              style={{
                fontFamily: 'inherit', fontSize: 18, fontWeight: 700,
                background: 'var(--accent)', color: '#fff', border: 'none',
                padding: '16px 40px', borderRadius: 4, cursor: 'pointer',
                letterSpacing: '0.02em',
              }}>
              🖍️ Open Canvas
            </button>
          </div>
        )}
        {tab === 'type' && <FreeNotepad />}
      </div>
    </div>
  )
}
