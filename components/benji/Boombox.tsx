'use client'

import { useEffect, useRef, useState } from 'react'

interface Track {
  title: string
  url: string
  dbId?: number
}

interface Props {
  onClose: () => void
}

interface Scheme {
  name: string
  border: string
  bg: string
  handleBg: string
  strip: string
  btnBg: string
  btnColor: string
  activeColor: string
  ledText: string
  ledBg: string
  ledBorder: string
  ledGlow: string
  speaker: string
  speakerShadow: string
  cassetteBg: string
  reelBorder: string
  reelBg: string
  playlistActive: string
  playlistDim: string
  mutedBtn: string
}

const SCHEMES: Scheme[] = [
  {
    name: 'Gold',
    border: '#C8A020',
    bg: 'linear-gradient(180deg, #1A1408 0%, #0C0804 100%)',
    handleBg: 'linear-gradient(180deg, #2A2010, #1A1408)',
    strip: 'linear-gradient(90deg, transparent, #C8A020 20%, #FFE060 50%, #C8A020 80%, transparent)',
    btnBg: 'linear-gradient(180deg, #2E2208 0%, #1A1408 100%)',
    btnColor: '#C8A020',
    activeColor: '#4DB86A',
    ledText: '#FFB000',
    ledBg: '#0A0600',
    ledBorder: '#3A2A00',
    ledGlow: '0 0 10px #FF8800, 0 0 20px rgba(255,176,0,0.35)',
    speaker: '#0A0804',
    speakerShadow: 'inset 0 0 0 3px #C8A020, inset 0 0 0 8px #0A0804, inset 0 0 0 11px #8A6010, inset 0 0 0 14px #0A0804, inset 0 0 0 17px #5A4010, inset 0 0 0 23px #0A0804',
    cassetteBg: '#060402',
    reelBorder: '#5A4010',
    reelBg: '#1A1004',
    playlistActive: '#FFB000',
    playlistDim: '#5A4010',
    mutedBtn: '#5A4010',
  },
  {
    name: 'Galactic',
    border: '#4080C0',
    bg: 'linear-gradient(180deg, #0A1020 0%, #050810 100%)',
    handleBg: 'linear-gradient(180deg, #0C1828, #060C18)',
    strip: 'linear-gradient(90deg, transparent, #4080C0 20%, #80C0FF 50%, #4080C0 80%, transparent)',
    btnBg: 'linear-gradient(180deg, #0E1E38 0%, #080E1C 100%)',
    btnColor: '#60A0E0',
    activeColor: '#40E0A0',
    ledText: '#60C0FF',
    ledBg: '#020810',
    ledBorder: '#0A2040',
    ledGlow: '0 0 10px #4080FF, 0 0 20px rgba(64,128,255,0.35)',
    speaker: '#060810',
    speakerShadow: 'inset 0 0 0 3px #4080C0, inset 0 0 0 8px #060810, inset 0 0 0 11px #204860, inset 0 0 0 14px #060810, inset 0 0 0 17px #102840, inset 0 0 0 23px #060810',
    cassetteBg: '#020408',
    reelBorder: '#102840',
    reelBg: '#080C18',
    playlistActive: '#60C0FF',
    playlistDim: '#204060',
    mutedBtn: '#204060',
  },
  {
    name: 'Fuchsia',
    border: '#E040A0',
    bg: 'linear-gradient(180deg, #1A0818 0%, #0C0410 100%)',
    handleBg: 'linear-gradient(180deg, #2A0828, #180410)',
    strip: 'linear-gradient(90deg, transparent, #E040A0 20%, #FF80D0 50%, #E040A0 80%, transparent)',
    btnBg: 'linear-gradient(180deg, #280820 0%, #180412 100%)',
    btnColor: '#E060B0',
    activeColor: '#40E080',
    ledText: '#FF80D0',
    ledBg: '#0C0010',
    ledBorder: '#400028',
    ledGlow: '0 0 10px #FF00A0, 0 0 20px rgba(255,0,160,0.35)',
    speaker: '#0C0410',
    speakerShadow: 'inset 0 0 0 3px #E040A0, inset 0 0 0 8px #0C0410, inset 0 0 0 11px #601040, inset 0 0 0 14px #0C0410, inset 0 0 0 17px #400828, inset 0 0 0 23px #0C0410',
    cassetteBg: '#080006',
    reelBorder: '#400828',
    reelBg: '#180410',
    playlistActive: '#FF80D0',
    playlistDim: '#401030',
    mutedBtn: '#401030',
  },
]

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open('benjiHQ', 1)
    req.onupgradeneeded = e => {
      (e.target as IDBOpenDBRequest).result.createObjectStore('songs', { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = e => res((e.target as IDBOpenDBRequest).result)
    req.onerror = () => rej()
  })
}

function loadAllSongs(db: IDBDatabase): Promise<Array<{ id: number; title: string; blob: Blob }>> {
  return new Promise(res => {
    const tx = db.transaction('songs', 'readonly')
    const req = tx.objectStore('songs').getAll()
    req.onsuccess = () => res(req.result || [])
  })
}

function saveSong(db: IDBDatabase, title: string, blob: Blob): Promise<number> {
  return new Promise(res => {
    const tx = db.transaction('songs', 'readwrite')
    const req = tx.objectStore('songs').add({ title, blob })
    req.onsuccess = () => res(req.result as number)
  })
}

function deleteSong(db: IDBDatabase, id: number): Promise<void> {
  return new Promise(res => {
    const tx = db.transaction('songs', 'readwrite')
    tx.objectStore('songs').delete(id)
    tx.oncomplete = () => res()
  })
}

export default function Boombox({ onClose }: Props) {
  const [playlist, setPlaylist] = useState<Track[]>([])
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState({ x: 20, y: 120 })
  const [schemeIdx, setSchemeIdx] = useState(0)
  const [handleState, setHandleState] = useState<'idle' | 'hover' | 'grip'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dbRef = useRef<IDBDatabase | null>(null)
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const s = SCHEMES[schemeIdx]

  useEffect(() => {
    const saved = localStorage.getItem('boombox-pos')
    if (saved) { try { setPos(JSON.parse(saved)) } catch {} }
    const savedScheme = localStorage.getItem('boombox-scheme')
    if (savedScheme) { try { setSchemeIdx(Number(savedScheme)) } catch {} }

    openDB().then(db => {
      dbRef.current = db
      return loadAllSongs(db)
    }).then(stored => {
      const tracks = stored.map(r => ({ title: r.title, url: URL.createObjectURL(r.blob), dbId: r.id }))
      if (tracks.length) setPlaylist(tracks)
    }).catch(() => {})

    audioRef.current = new Audio()
    const audio = audioRef.current
    audio.addEventListener('ended', () => {
      setIdx(i => (i + 1) % Math.max(playlist.length, 1))
    })
    return () => { audio.pause() }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !playlist.length) return
    const track = playlist[idx % playlist.length]
    if (!track) return
    audio.src = track.url
    if (playing) audio.play().catch(() => {})
  }, [idx, playlist])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio || !playlist.length) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().catch(() => {}); setPlaying(true) }
  }

  function prev() {
    setIdx((idx - 1 + playlist.length) % Math.max(playlist.length, 1))
    if (playing) audioRef.current?.play().catch(() => {})
  }

  function next() {
    setIdx((idx + 1) % Math.max(playlist.length, 1))
    if (playing) audioRef.current?.play().catch(() => {})
  }

  async function loadFiles(files: FileList) {
    const db = dbRef.current
    if (!db) return
    const newTracks: Track[] = []
    for (const f of Array.from(files)) {
      const title = f.name.replace(/\.[^.]+$/, '')
      const id = await saveSong(db, title, f)
      const url = URL.createObjectURL(f)
      newTracks.push({ title, url, dbId: id })
    }
    setPlaylist(prev => {
      const next = [...prev, ...newTracks]
      if (prev.length === 0 && next.length > 0) {
        setIdx(0)
        setTimeout(() => {
          audioRef.current!.src = next[0].url
          audioRef.current!.play().catch(() => {})
          setPlaying(true)
        }, 100)
      }
      return next
    })
  }

  async function removeSong(track: Track) {
    const db = dbRef.current
    if (db && track.dbId) await deleteSong(db, track.dbId)
    URL.revokeObjectURL(track.url)
    setPlaylist(prev => {
      const next = prev.filter(t => t !== track)
      if (next.length === 0) { audioRef.current?.pause(); setPlaying(false) }
      return next
    })
  }

  function cycleScheme() {
    const next = (schemeIdx + 1) % SCHEMES.length
    setSchemeIdx(next)
    localStorage.setItem('boombox-scheme', String(next))
  }

  // Drag logic
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return
      const dx = e.clientX - dragging.current.startX
      const dy = e.clientY - dragging.current.startY
      const newPos = { x: dragging.current.origX + dx, y: dragging.current.origY + dy }
      setPos(newPos)
      localStorage.setItem('boombox-pos', JSON.stringify(newPos))
    }
    function onUp() {
      if (dragging.current) {
        dragging.current = null
        setHandleState('idle')
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const currentTitle = playlist.length > 0 ? playlist[idx % playlist.length]?.title || 'No songs' : 'No songs loaded'

  return (
    <div style={{ position: 'fixed', left: pos.x, top: pos.y, width: '300px', zIndex: 900, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Handle */}
      <div
        onMouseEnter={() => setHandleState('hover')}
        onMouseLeave={() => { if (!dragging.current) setHandleState('idle') }}
        onMouseDown={e => {
          setHandleState('grip')
          dragging.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
        }}
        style={{
          height: 22, margin: '0 60px', position: 'relative',
          border: `2.5px solid ${s.border}`, borderBottom: 'none', borderRadius: '8px 8px 0 0',
          background: s.handleBg,
          cursor: handleState === 'grip' ? 'grabbing' : handleState === 'hover' ? 'none' : 'grab',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible',
        }}
      >
        {handleState !== 'idle' && (
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 56,
            lineHeight: 1,
            pointerEvents: 'none',
            animation: handleState === 'grip' ? 'grip-squeeze 0.15s ease-out forwards' : undefined,
            zIndex: 10,
          }}>
            {handleState === 'grip' ? '✊' : '✋'}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{
        background: s.bg,
        border: `2px solid ${s.border}`, borderRadius: '0 0 8px 8px',
        padding: '10px 12px 0', overflow: 'hidden',
      }}>
        {/* Gold strip */}
        <div style={{ height: 4, background: s.strip, marginBottom: 8, borderRadius: 2 }} />

        {/* Main row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Left Speaker */}
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: s.speaker, boxShadow: s.speakerShadow, flexShrink: 0 }} />

          {/* Center */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {/* Cassette */}
            <div style={{ width: 90, height: 46, background: s.cassetteBg, borderRadius: 5, border: `1.5px solid ${s.border}`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '5px 10px' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${s.reelBorder}`, background: s.reelBg, animation: playing ? 'spin-reel 0.7s linear infinite' : undefined }} />
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${s.reelBorder}`, background: s.reelBg, animation: playing ? 'spin-reel 0.7s linear infinite' : undefined }} />
              <div style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', width: 16, height: 7, borderBottom: `2px solid ${s.reelBorder}`, borderRadius: '0 0 8px 8px' }} />
            </div>

            {/* LED Track */}
            <div style={{
              fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: 700,
              color: s.ledText, background: s.ledBg, border: `1px solid ${s.ledBorder}`,
              padding: '5px 8px', borderRadius: 2, width: '100%', textAlign: 'center',
              textShadow: s.ledGlow,
              letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', animation: 'led-pulse 2s ease-in-out infinite',
              lineHeight: 1.3,
            }}>
              {currentTitle}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 5 }}>
              {[
                { label: '⏮', onClick: prev },
                { label: playing ? '⏸' : '▶', onClick: togglePlay, active: playing },
                { label: '⏭', onClick: next },
              ].map(btn => (
                <button key={btn.label} onClick={btn.onClick}
                  style={{
                    fontFamily: 'inherit', fontSize: 13,
                    background: s.btnBg,
                    border: `1.5px solid ${btn.active ? s.activeColor : s.btnColor}`,
                    borderRadius: 3, width: 30, height: 26, cursor: 'pointer',
                    color: btn.active ? s.activeColor : s.btnColor,
                    textShadow: btn.active ? `0 0 8px ${s.activeColor}60` : undefined,
                  }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Speaker */}
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: s.speaker, boxShadow: s.speakerShadow, flexShrink: 0 }} />
        </div>

        {/* Smiley */}
        <div style={{ textAlign: 'center', fontSize: 18, marginTop: 6, marginBottom: 2, opacity: 0.7 }}>😊</div>

        {/* Bottom */}
        <div style={{ marginTop: 10, borderTop: `1px solid ${s.border}30`, padding: '8px 0 10px' }}>
          {playlist.length > 0 && (
            <div style={{ maxHeight: 80, overflowY: 'auto', marginBottom: 6 }}>
              {playlist.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                  <span style={{ fontSize: 10, color: i === idx % playlist.length ? s.playlistActive : s.playlistDim, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i === idx % playlist.length ? '▶ ' : '  '}{t.title}
                  </span>
                  <button onClick={() => removeSong(t)} style={{ background: 'none', border: 'none', color: s.mutedBtn, cursor: 'pointer', fontSize: 11, padding: '0 2px', fontFamily: 'inherit' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: s.btnColor, cursor: 'pointer', padding: '4px 8px', border: `1px solid ${s.btnColor}`, borderRadius: 2 }}>
              + Add Songs
              <input ref={fileRef} type="file" multiple accept="audio/*" style={{ display: 'none' }} onChange={e => e.target.files && loadFiles(e.target.files)} />
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={cycleScheme} title={`Theme: ${s.name} → ${SCHEMES[(schemeIdx + 1) % SCHEMES.length].name}`}
                style={{ background: 'none', border: `1px solid ${s.btnColor}40`, borderRadius: 2, cursor: 'pointer', fontSize: 10, color: s.btnColor, padding: '3px 7px', fontFamily: 'inherit', letterSpacing: '0.06em' }}>
                {s.name}
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: s.mutedBtn, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Hide</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
