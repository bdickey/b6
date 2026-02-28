'use client'

import { useEffect, useRef, useState } from 'react'

const COLORS = ['#E74C3C', '#E67E22', '#D4AC0D', '#4DB86A', '#2980B9', '#9B59B6', '#1ABC9C', '#2C3E50']

type BrushMode = 'thin' | 'normal' | 'thick' | 'sparkle'

const BRUSHES: { id: BrushMode; label: string; lineWidth: number }[] = [
  { id: 'thin', label: '—', lineWidth: 4 },
  { id: 'normal', label: '━', lineWidth: 14 },
  { id: 'thick', label: '▬', lineWidth: 32 },
  { id: 'sparkle', label: '✦', lineWidth: 14 },
]

interface Props {
  onExit: () => void
}

export default function DrawingCanvas({ onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeColor, setActiveColor] = useState(COLORS[0])
  const [brushMode, setBrushMode] = useState<BrushMode>('normal')
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
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory(h => [...h.slice(-9), imageData])
    setIsDrawing(true)
    lastPos.current = getPos(e)
  }

  function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    const count = 6 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 4 + Math.random() * 18
      const size = 1.5 + Math.random() * 3.5
      ctx.beginPath()
      ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, size, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.55 + Math.random() * 0.45
      ctx.fill()
    }
    // Center dot
    ctx.beginPath()
    ctx.arc(x, y, 5 + Math.random() * 4, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = 0.9
    ctx.fill()
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || !lastPos.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    const brush = BRUSHES.find(b => b.id === brushMode)!

    if (brushMode === 'sparkle') {
      drawSparkle(ctx, pos.x, pos.y, activeColor)
    } else {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = activeColor
      ctx.lineWidth = brush.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = brushMode === 'thick' ? 0.7 : 0.88
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    lastPos.current = pos
  }

  function endDraw() { setIsDrawing(false); lastPos.current = null }

  function undo() {
    if (history.length === 0) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(history[history.length - 1], 0, 0)
    setHistory(h => h.slice(0, -1))
  }

  function erase() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    setHistory(h => [...h.slice(-9), ctx.getImageData(0, 0, canvas.width, canvas.height)])
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  function savePng() {
    const canvas = canvasRef.current!
    const tmp = document.createElement('canvas')
    tmp.width = canvas.width; tmp.height = canvas.height
    const tctx = tmp.getContext('2d')!
    tctx.fillStyle = '#fff'; tctx.fillRect(0, 0, tmp.width, tmp.height)
    tctx.drawImage(canvas, 0, 0)
    const link = document.createElement('a')
    link.download = `benji-drawing-${Date.now()}.png`
    link.href = tmp.toDataURL()
    link.click()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050 }}>
      <div style={{ position: 'fixed', inset: 0, background: 'white', opacity: 0.5, pointerEvents: 'none', zIndex: 1049 }} />
      <canvas ref={canvasRef}
        style={{ position: 'fixed', inset: 0, zIndex: 1050, cursor: 'crosshair', background: 'transparent' }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
      />

      {/* Toolbar */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 4,
        display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px',
        zIndex: 1100, boxShadow: '0 4px 20px rgba(0,0,0,0.13)', whiteSpace: 'nowrap',
      }}>

        {/* Color swatches */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingRight: 10, borderRight: '1px solid var(--border)', marginRight: 2 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setActiveColor(c)}
              style={{
                width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', padding: 0,
                border: activeColor === c ? '3px solid var(--text)' : '2px solid rgba(0,0,0,0.12)',
                transform: activeColor === c ? 'scale(1.25)' : 'scale(1)',
                transition: 'transform 0.1s',
              }} />
          ))}
          {/* Custom color picker */}
          <label title="Custom color" style={{ position: 'relative', width: 22, height: 22, cursor: 'pointer', flexShrink: 0 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
              background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
              border: '2px solid rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
            }}>+</div>
            <input type="color" value={activeColor} onChange={e => setActiveColor(e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
          </label>
        </div>

        {/* Brush modes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingRight: 10, borderRight: '1px solid var(--border)', marginRight: 2 }}>
          {BRUSHES.map(b => (
            <button key={b.id} onClick={() => setBrushMode(b.id)} title={b.id}
              style={{
                fontFamily: 'inherit', fontSize: b.id === 'sparkle' ? 14 : 16, fontWeight: 700,
                padding: '3px 8px', cursor: 'pointer', borderRadius: 2,
                border: brushMode === b.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: brushMode === b.id ? 'rgba(42,122,75,0.08)' : 'none',
                color: brushMode === b.id ? 'var(--accent)' : 'var(--mid)',
              }}>
              {b.label}
            </button>
          ))}
        </div>

        <button onClick={undo} disabled={history.length === 0}
          style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '5px 10px', cursor: history.length === 0 ? 'not-allowed' : 'pointer', color: 'var(--mid)', opacity: history.length === 0 ? 0.35 : 1 }}>
          ↩ Undo
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
        <button onClick={erase}
          style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '5px 10px', cursor: 'pointer', color: 'var(--accent2)' }}>
          Clear
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
