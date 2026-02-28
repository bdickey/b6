'use client'

import { useEffect, useRef, useState } from 'react'

const OBJECTS = [
  { emoji: '🎾', color: '#4DB86A', x: 480, y: 40, rot: 15 },
  { emoji: '🦕', color: '#9B59B6', x: 620, y: 80, rot: -10 },
  { emoji: '⚽', color: '#2C3E50', x: 750, y: 30, rot: 5 },
  { emoji: '🎨', color: '#E67E22', x: 840, y: 100, rot: -20 },
  { emoji: '📚', color: '#2980B9', x: 920, y: 50, rot: 12 },
  { emoji: '🏆', color: '#D4AC0D', x: 1020, y: 85, rot: -8 },
  { emoji: '🖍️', color: '#E74C3C', x: 1120, y: 35, rot: 18 },
  { emoji: '🚀', color: '#1ABC9C', x: 1200, y: 90, rot: -15 },
]

interface DragPos { x: number; y: number }

export default function HeroSection() {
  const [positions, setPositions] = useState<DragPos[]>(
    OBJECTS.map(o => ({ x: o.x, y: o.y }))
  )
  const dragging = useRef<{ idx: number; startX: number; startY: number; origX: number; origY: number } | null>(null)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const dx = e.clientX - dragging.current.startX
      const dy = e.clientY - dragging.current.startY
      setPositions(prev => prev.map((p, i) =>
        i === dragging.current!.idx
          ? { x: dragging.current!.origX + dx, y: dragging.current!.origY + dy }
          : p
      ))
    }
    function onMouseUp() { dragging.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div style={{
      position: 'relative', height: 220,
      background: 'var(--bg)', borderBottom: '1px solid var(--border)',
      marginBottom: 0,
      marginLeft: -24, marginRight: -24, marginTop: -24,
      zIndex: 2,
    }}>
      {/* Watermark "6" */}
      <div style={{
        position: 'absolute', fontSize: 180, fontWeight: 900,
        color: 'rgba(17,17,17,0.05)', lineHeight: 1,
        top: 10, left: 16, userSelect: 'none', letterSpacing: '-0.05em',
        pointerEvents: 'none',
      }}>6</div>

      {/* Hero text */}
      <div style={{ position: 'absolute', bottom: 24, left: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.1 }}>
          Good {getTimeOfDay()}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 }}>
          Family Command Center
        </div>
      </div>

      {/* Scattered emoji objects */}
      {OBJECTS.map((obj, i) => (
        <div
          key={i}
          onMouseDown={e => {
            e.preventDefault()
            dragging.current = { idx: i, startX: e.clientX, startY: e.clientY, origX: positions[i].x, origY: positions[i].y }
          }}
          style={{
            position: 'absolute',
            left: positions[i].x,
            top: positions[i].y,
            fontSize: 36, lineHeight: 1,
            userSelect: 'none', cursor: 'grab',
            transform: `rotate(${obj.rot}deg)`,
            transition: dragging.current?.idx === i ? 'none' : undefined,
            zIndex: 5,
          }}
        >
          {obj.emoji}
        </div>
      ))}
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}
