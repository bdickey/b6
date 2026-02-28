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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dbRef = useRef<IDBDatabase | null>(null)
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load saved position
    const saved = localStorage.getItem('boombox-pos')
    if (saved) {
      try { setPos(JSON.parse(saved)) } catch {}
    }

    // Init DB + load songs
    openDB().then(db => {
      dbRef.current = db
      return loadAllSongs(db)
    }).then(stored => {
      const tracks = stored.map(r => ({
        title: r.title,
        url: URL.createObjectURL(r.blob),
        dbId: r.id,
      }))
      if (tracks.length) {
        setPlaylist(tracks)
      }
    }).catch(() => {})

    audioRef.current = new Audio()
    const audio = audioRef.current
    audio.addEventListener('ended', () => {
      setIdx(i => {
        const next = (i + 1) % Math.max(playlist.length, 1)
        return next
      })
    })

    return () => {
      audio.pause()
    }
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
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().catch(() => {})
      setPlaying(true)
    }
  }

  function prev() {
    const newIdx = (idx - 1 + playlist.length) % Math.max(playlist.length, 1)
    setIdx(newIdx)
    if (playing) audioRef.current?.play().catch(() => {})
  }

  function next() {
    const newIdx = (idx + 1) % Math.max(playlist.length, 1)
    setIdx(newIdx)
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
        // Start playing first song
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
      if (next.length === 0) {
        audioRef.current?.pause()
        setPlaying(false)
      }
      return next
    })
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
    function onUp() { dragging.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const currentTitle = playlist.length > 0 ? playlist[idx % playlist.length]?.title || 'No songs' : 'No songs loaded'

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y,
      width: '300px', zIndex: 900,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Handle */}
      <div
        onMouseDown={e => { dragging.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y } }}
        style={{
          height: 16, margin: '0 60px',
          border: '2.5px solid #C8A020', borderBottom: 'none', borderRadius: '8px 8px 0 0',
          background: 'linear-gradient(180deg, #2A2010, #1A1408)',
          cursor: 'grab',
        }}
      />

      {/* Body */}
      <div style={{
        background: 'linear-gradient(180deg, #1A1408 0%, #0C0804 100%)',
        border: '2px solid #C8A020', borderRadius: '0 0 8px 8px',
        padding: '10px 12px 0',
        overflow: 'hidden',
      }}>
        {/* Gold strip */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, transparent, #C8A020 20%, #FFE060 50%, #C8A020 80%, transparent)', marginBottom: 8, borderRadius: 2 }} />

        {/* Main row: speaker | center | speaker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Left Speaker */}
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#0A0804', boxShadow: 'inset 0 0 0 3px #C8A020, inset 0 0 0 8px #0A0804, inset 0 0 0 11px #8A6010, inset 0 0 0 14px #0A0804, inset 0 0 0 17px #5A4010, inset 0 0 0 23px #0A0804', flexShrink: 0 }} />

          {/* Center */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {/* Cassette */}
            <div style={{ width: 90, height: 46, background: '#060402', borderRadius: 5, border: '1.5px solid #C8A020', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '5px 10px' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #5A4010', background: '#1A1004', animation: playing ? 'spin-reel 0.7s linear infinite' : undefined }} />
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #5A4010', background: '#1A1004', animation: playing ? 'spin-reel 0.7s linear infinite' : undefined }} />
              <div style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', width: 16, height: 7, borderBottom: '2px solid #3A2A08', borderRadius: '0 0 8px 8px' }} />
            </div>

            {/* LED Track — bigger, cooler font */}
            <div style={{
              fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 700,
              color: '#FFB000', background: '#0A0600', border: '1px solid #3A2A00',
              padding: '4px 8px', borderRadius: 2, width: '100%', textAlign: 'center',
              textShadow: '0 0 8px #FF8800, 0 0 16px rgba(255,176,0,0.4)',
              letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis',
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
                    background: 'linear-gradient(180deg, #2E2208 0%, #1A1408 100%)',
                    border: `1.5px solid ${btn.active ? '#4DB86A' : '#C8A020'}`,
                    borderRadius: 3, width: 30, height: 26, cursor: 'pointer',
                    color: btn.active ? '#4DB86A' : '#C8A020',
                    textShadow: btn.active ? '0 0 8px rgba(77,184,106,0.6)' : undefined,
                  }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Speaker */}
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#0A0804', boxShadow: 'inset 0 0 0 3px #C8A020, inset 0 0 0 8px #0A0804, inset 0 0 0 11px #8A6010, inset 0 0 0 14px #0A0804, inset 0 0 0 17px #5A4010, inset 0 0 0 23px #0A0804', flexShrink: 0 }} />
        </div>

        {/* Smiley face */}
        <div style={{ textAlign: 'center', fontSize: 18, marginTop: 6, marginBottom: 2, opacity: 0.7 }}>😊</div>

        {/* Bottom: playlist + add songs */}
        <div style={{ marginTop: 10, borderTop: '1px solid rgba(200,160,32,0.2)', padding: '8px 0 10px' }}>
          {/* Playlist (max 4 shown) */}
          {playlist.length > 0 && (
            <div style={{ maxHeight: 80, overflowY: 'auto', marginBottom: 6 }}>
              {playlist.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                  <span style={{ fontSize: 9, color: i === idx % playlist.length ? '#FFB000' : '#5A4010', fontFamily: 'Courier New', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i === idx % playlist.length ? '▶ ' : '  '}{t.title}
                  </span>
                  <button onClick={() => removeSong(t)} style={{ background: 'none', border: 'none', color: '#5A4010', cursor: 'pointer', fontSize: 11, padding: '0 2px', fontFamily: 'inherit' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8A020', cursor: 'pointer', padding: '4px 8px', border: '1px solid #C8A020', borderRadius: 2 }}>
              + Add Songs
              <input ref={fileRef} type="file" multiple accept="audio/*" style={{ display: 'none' }} onChange={e => e.target.files && loadFiles(e.target.files)} />
            </label>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5A4010', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Hide</button>
          </div>
        </div>
      </div>
    </div>
  )
}
