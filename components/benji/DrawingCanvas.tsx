'use client'

import { useEffect, useRef, useState } from 'react'

const MARKERS = [
  { emoji: '🎾', color: '#4DB86A' },
  { emoji: '🦕', color: '#9B59B6' },
  { emoji: '⚽', color: '#2C3E50' },
  { emoji: '🎨', color: '#E67E22' },
  { emoji: '📚', color: '#2980B9' },
  { emoji: '🏆', color: '#D4AC0D' },
  { emoji: '🖍️', color: '#E74C3C' },
  { emoji: '🚀', color: '#1ABC9C' },
]

interface Props {
  onExit: () => void
}

export default function DrawingCanvas({ onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeColor, setActiveColor] = useState(MARKERS[0].color)
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory] = useState<ImageData[]>([])
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    // Save state for undo
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory(h => [...h.slice(-4), imageData])
    setIsDrawing(true)
    lastPos.current = getPos(e)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || !lastPos.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = activeColor
    ctx.lineWidth = 14
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.88
    ctx.stroke()

    lastPos.current = pos
  }

  function endDraw() {
    setIsDrawing(false)
    lastPos.current = null
  }

  function undo() {
    if (history.length === 0) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const prev = history[history.length - 1]
    ctx.putImageData(prev, 0, 0)
    setHistory(h => h.slice(0, -1))
  }

  function erase() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory(h => [...h.slice(-4), imageData])
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  function savePng() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    // Create temp canvas with white bg
    const tmp = document.createElement('canvas')
    tmp.width = canvas.width
    tmp.height = canvas.height
    const tctx = tmp.getContext('2d')!
    tctx.fillStyle = '#fff'
    tctx.fillRect(0, 0, tmp.width, tmp.height)
    tctx.drawImage(canvas, 0, 0)
    const link = document.createElement('a')
    link.download = `benji-drawing-${Date.now()}.png`
    link.href = tmp.toDataURL()
    link.click()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
      {/* White 50% overlay so page shows through */}
      <div style={{ position: 'fixed', inset: 0, background: 'white', opacity: 0.5, pointerEvents: 'none', zIndex: 499 }} />

      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, zIndex: 500, cursor: 'crosshair', background: 'transparent' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />

      {/* Toolbar */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 4,
        display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px',
        zIndex: 700, boxShadow: '0 4px 20px rgba(0,0,0,0.13)', whiteSpace: 'nowrap',
      }}>
        {/* Color swatches */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12, borderRight: '1px solid var(--border)', marginRight: 4 }}>
          {MARKERS.map(m => (
            <button key={m.color} onClick={() => setActiveColor(m.color)} title={m.emoji}
              style={{
                width: 24, height: 24, borderRadius: '50%', background: m.color,
                border: activeColor === m.color ? '3px solid var(--text)' : '2px solid rgba(0,0,0,0.15)',
                cursor: 'pointer', fontSize: 12,
                transform: activeColor === m.color ? 'scale(1.25)' : 'scale(1)',
                transition: 'transform 0.1s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            />
          ))}
        </div>

        <button onClick={undo} disabled={history.length === 0}
          style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '5px 10px', cursor: history.length === 0 ? 'not-allowed' : 'pointer', color: history.length === 0 ? 'var(--border)' : 'var(--mid)', opacity: history.length === 0 ? 0.35 : 1 }}>
          ↩ Undo
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        <button onClick={erase}
          style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '5px 10px', cursor: 'pointer', color: 'var(--accent2)' }}>
          Erase
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        <button onClick={savePng}
          style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '5px 10px', cursor: 'pointer', color: 'var(--mid)' }}>
          Save PNG
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        <button onClick={onExit}
          style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'none', border: '1px solid var(--accent2)', borderRadius: 2, padding: '5px 10px', cursor: 'pointer', color: 'var(--accent2)' }}>
          ✕ Exit
        </button>
      </div>
    </div>
  )
}
