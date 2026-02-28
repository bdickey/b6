'use client'

import { useState, useRef } from 'react'

const COLORS = ['#111111', '#E74C3C', '#E67E22', '#F1C40F', '#2A7A4B', '#2980B9', '#9B59B6', '#E91E8C']

const KID_EMOJI = [
  '😀','😂','😍','🤩','😎','🥳','😜','🤪',
  '🐱','🐶','🐸','🐻','🦊','🐼','🐨','🐯',
  '🦁','🐮','🐷','🐔','🦆','🦅','🐧','🦋',
  '🌸','🌈','⭐','🌙','☀️','🌊','🏔','🌺',
  '🍎','🍕','🍦','🎂','🍓','🍭','🍬','🍫',
  '🚀','🚗','✈️','🚂','🎈','🎁','🎮','🏆',
  '❤️','💙','💚','💛','💜','🧡','💖','💫',
  '🎵','⚽','🏀','🎨','📚','🦕','🔥','✨',
]

export default function FreeNotepad() {
  const [text, setText] = useState('')
  const [color, setColor] = useState('#111111')
  const [showEmoji, setShowEmoji] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertEmoji(emoji: string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const newText = text.slice(0, start) + emoji + text.slice(end)
    setText(newText)
    // Restore cursor
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  function handleClear() {
    if (clearConfirm) {
      setText('')
      setClearConfirm(false)
    } else {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 3000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        {/* Color swatches */}
        <div style={{ display: 'flex', gap: 6, paddingRight: 12, borderRight: '1px solid var(--border)' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              style={{
                width: 22, height: 22, borderRadius: '50%', background: c,
                border: color === c ? '3px solid var(--text)' : '1.5px solid rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transform: color === c ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.1s',
              }}
            />
          ))}
        </div>

        {/* Emoji toggle */}
        <button onClick={() => setShowEmoji(s => !s)}
          style={{ fontFamily: 'inherit', fontSize: 14, background: showEmoji ? 'var(--bg)' : 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '4px 10px', cursor: 'pointer' }}>
          😊 Emoji
        </button>

        {/* Clear */}
        <button onClick={handleClear}
          style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: clearConfirm ? '#fff' : 'var(--accent2)', background: clearConfirm ? 'var(--accent2)' : 'none', border: `1px solid ${clearConfirm ? 'var(--accent2)' : 'var(--border)'}`, padding: '5px 12px', cursor: 'pointer', borderRadius: 3, marginLeft: 'auto', transition: 'all 0.15s' }}>
          {clearConfirm ? 'Tap again to clear' : 'Clear'}
        </button>
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {KID_EMOJI.map(e => (
            <button key={e} onClick={() => insertEmoji(e)}
              style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 3, transition: 'transform 0.1s' }}
              onMouseEnter={el => (el.currentTarget.style.transform = 'scale(1.3)')}
              onMouseLeave={el => (el.currentTarget.style.transform = 'scale(1)')}
            >{e}</button>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Start typing…"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          flex: 1, padding: '24px 28px', fontSize: 28, lineHeight: 1.6,
          border: 'none', outline: 'none', resize: 'none',
          background: 'var(--white)',
          color, fontFamily: 'inherit', fontWeight: 500,
          width: '100%',
        }}
      />
    </div>
  )
}
