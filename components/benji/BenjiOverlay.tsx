'use client'

import { useState, useEffect } from 'react'
import SpellingGame from './SpellingGame'
import DrawingCanvas from './DrawingCanvas'
import FreeNotepad from './FreeNotepad'

interface Props {
  onClose: () => void
}

type Tab = 'spell' | 'draw' | 'type'

const COLORS = ['#FF6B6B','#FF3CAC','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#FFB347','#B8E986','#FF8C42','#A8FF3E','#00F5FF','#FF006E','#FB5607']
// Deterministic confetti so no hydration mismatch — 120 pieces, varied shapes, longer fall
const CONFETTI_PIECES = Array.from({ length: 120 }, (_, i) => ({
  id: i,
  left: ((i * 73 + 11) % 100),
  delay: ((i * 37) % 300) / 100,           // up to 3s staggered delay
  duration: 2.5 + ((i * 53) % 300) / 100,  // 2.5s – 5.5s fall
  color: COLORS[i % COLORS.length],
  size: 6 + (i * 11) % 16,                 // 6px – 22px
  isCircle: i % 4 === 0,
  isLong: i % 5 === 1,                      // ribbon-style pieces
  rotation: (i * 47) % 360,
  drift: ((i * 61) % 80) - 40,             // horizontal drift -40px to +40px
}))

export default function BenjiOverlay({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('spell')
  const [drawingMode, setDrawingMode] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [introFading, setIntroFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setIntroFading(true), 2800)
    const t2 = setTimeout(() => setShowIntro(false), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

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
    <>
      {/* Confetti */}
      {showIntro && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1200, overflow: 'hidden' }}>
          {CONFETTI_PIECES.map(p => (
            <div key={p.id} style={{
              position: 'absolute', top: -30, left: `${p.left}%`,
              width: p.isLong ? p.size / 2 : p.size,
              height: p.isLong ? p.size * 3 : p.size,
              background: p.color,
              borderRadius: p.isCircle ? '50%' : p.isLong ? '2px' : '3px',
              transform: `rotate(${p.rotation}deg)`,
              animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in both`,
              '--drift': `${p.drift}px`,
            } as React.CSSProperties} />
          ))}
        </div>
      )}

      {/* BENJI MODE announcement */}
      {showIntro && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(26,90,55,0.92)',
          animation: introFading
            ? 'benji-intro-out 0.5s ease-in forwards'
            : 'benji-intro-in 0.35s ease-out',
          pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 12 }}>🦕</div>
            <div style={{
              fontSize: 'clamp(48px, 10vw, 88px)', fontWeight: 900,
              color: '#fff', letterSpacing: '-0.02em', textTransform: 'uppercase',
              fontFamily: 'Inter, system-ui, sans-serif',
              textShadow: '0 4px 24px rgba(0,0,0,0.4)',
              lineHeight: 1,
            }}>
              BENJI MODE
            </div>
          </div>
        </div>
      )}

      {/* Main overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1050,
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
    </>
  )
}
