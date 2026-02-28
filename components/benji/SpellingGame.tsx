'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const SPELL_WORDS = [
  { word: 'cat', emoji: '🐱', hint: 'says meow' },
  { word: 'dog', emoji: '🐶', hint: 'says woof' },
  { word: 'sun', emoji: '☀️', hint: 'shines bright' },
  { word: 'hat', emoji: '🎩', hint: 'on your head' },
  { word: 'bee', emoji: '🐝', hint: 'makes honey' },
  { word: 'bear', emoji: '🐻', hint: 'likes honey' },
  { word: 'bird', emoji: '🐦', hint: 'can fly' },
  { word: 'fish', emoji: '🐟', hint: 'lives in water' },
  { word: 'frog', emoji: '🐸', hint: 'jumps and swims' },
  { word: 'duck', emoji: '🦆', hint: 'quack quack' },
  { word: 'cake', emoji: '🎂', hint: 'sweet treat' },
  { word: 'star', emoji: '⭐', hint: 'in the sky' },
  { word: 'tree', emoji: '🌳', hint: 'has leaves' },
  { word: 'lion', emoji: '🦁', hint: 'king of jungle' },
  { word: 'kite', emoji: '🪁', hint: 'flies in wind' },
  { word: 'rain', emoji: '🌧️', hint: 'makes puddles' },
  { word: 'boat', emoji: '⛵', hint: 'floats on water' },
  { word: 'drum', emoji: '🥁', hint: 'boom boom boom' },
  { word: 'wolf', emoji: '🐺', hint: 'howls at moon' },
  { word: 'rose', emoji: '🌹', hint: 'pretty flower' },
  { word: 'milk', emoji: '🥛', hint: 'from a cow' },
  { word: 'corn', emoji: '🌽', hint: 'yellow veggie' },
  { word: 'moon', emoji: '🌙', hint: 'shines at night' },
  { word: 'snail', emoji: '🐌', hint: 'moves slowly' },
  { word: 'grape', emoji: '🍇', hint: 'makes juice' },
  { word: 'apple', emoji: '🍎', hint: 'red and crunchy' },
  { word: 'horse', emoji: '🐴', hint: 'you can ride it' },
  { word: 'tiger', emoji: '🐯', hint: 'orange with stripes' },
  { word: 'whale', emoji: '🐋', hint: 'huge ocean animal' },
  { word: 'lemon', emoji: '🍋', hint: 'very sour' },
  { word: 'panda', emoji: '🐼', hint: 'black and white bear' },
  { word: 'eagle', emoji: '🦅', hint: 'giant bird' },
  { word: 'sheep', emoji: '🐑', hint: 'says baa' },
  { word: 'snake', emoji: '🐍', hint: 'no legs, slithers' },
  { word: 'bunny', emoji: '🐰', hint: 'big floppy ears' },
  { word: 'shark', emoji: '🦈', hint: 'big ocean fish' },
  { word: 'door', emoji: '🚪', hint: 'open and close it' },
  { word: 'flag', emoji: '🚩', hint: 'waves in wind' },
  { word: 'ball', emoji: '⚽', hint: 'kick and throw' },
  { word: 'bell', emoji: '🔔', hint: 'ring ring' },
  { word: 'blue', emoji: '💙', hint: 'color of sky' },
  { word: 'fist', emoji: '✊', hint: 'closed hand' },
  { word: 'gift', emoji: '🎁', hint: 'wrap it up' },
  { word: 'lamp', emoji: '💡', hint: 'gives light' },
  { word: 'nest', emoji: '🪺', hint: 'bird home' },
  { word: 'sand', emoji: '🏖️', hint: 'at the beach' },
  { word: 'wind', emoji: '💨', hint: 'blows your hair' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface SlotState {
  letter: string
  state: 'blank' | 'active' | 'correct' | 'wrong'
}

export default function SpellingGame() {
  const [queue, setQueue] = useState(() => shuffle(SPELL_WORDS))
  const [queueIdx, setQueueIdx] = useState(0)
  const [slots, setSlots] = useState<SlotState[]>([])
  const [activeSlot, setActiveSlot] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const supabase = createClient()

  const current = queue[queueIdx % queue.length]

  const loadWord = useCallback((word: string) => {
    setSlots(word.split('').map((_, i) => ({ letter: '', state: i === 0 ? 'active' : 'blank' })))
    setActiveSlot(0)
    setCelebrating(false)
  }, [])

  useEffect(() => {
    loadWord(current.word)
  }, [queueIdx, queue, loadWord, current.word])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (celebrating) return
      if (!e.key.match(/^[a-zA-Z]$/)) return

      const letter = e.key.toLowerCase()
      const expected = current.word[activeSlot]

      if (letter === expected) {
        setSlots(prev => prev.map((s, i) => i === activeSlot ? { letter, state: 'correct' } : s))
        const next = activeSlot + 1

        if (next >= current.word.length) {
          // Word complete!
          setCelebrating(true)
          setSessionCorrect(c => c + 1)
          setSessionTotal(t => t + 1)
          supabase.from('benji_spelling_log').insert({ correct: 1, total: 1 }).then(() => {})
          setTimeout(() => {
            if (queueIdx + 1 >= queue.length) {
              setQueue(shuffle(SPELL_WORDS))
              setQueueIdx(0)
            } else {
              setQueueIdx(i => i + 1)
            }
          }, 1600)
        } else {
          setActiveSlot(next)
          setSlots(prev => prev.map((s, i) => {
            if (i === activeSlot) return { letter, state: 'correct' }
            if (i === next) return { ...s, state: 'active' }
            return s
          }))
        }
      } else {
        setSlots(prev => prev.map((s, i) => i === activeSlot ? { letter, state: 'wrong' } : s))
        setSessionTotal(t => t + 1)
        setTimeout(() => {
          setSlots(prev => prev.map((s, i) => i === activeSlot ? { letter: '', state: 'active' } : s))
        }, 300)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeSlot, celebrating, current, queue, queueIdx, supabase])

  function skipWord() {
    if (queueIdx + 1 >= queue.length) {
      setQueue(shuffle(SPELL_WORDS))
      setQueueIdx(0)
    } else {
      setQueueIdx(i => i + 1)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 'calc(100vh - 56px)',
      padding: 40, userSelect: 'none',
    }}>
      {/* Emoji */}
      <div style={{
        fontSize: 130, lineHeight: 1, marginBottom: 8,
        animation: celebrating ? 'bounce-emoji 0.4s ease-in-out 3' : undefined,
      }}>
        {current.emoji}
      </div>

      {/* Hint */}
      <div style={{ fontSize: 16, color: 'var(--mid)', marginBottom: 32, letterSpacing: '0.02em' }}>
        {celebrating ? '🎉 NICE JOB!' : current.hint}
      </div>

      {/* Letter tiles */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
        {slots.map((slot, i) => (
          <div key={i} style={{
            width: 72, height: 72,
            border: `3px solid ${slot.state === 'active' ? 'var(--accent)' : slot.state === 'correct' ? 'var(--accent)' : slot.state === 'wrong' ? 'var(--accent2)' : 'var(--border)'}`,
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 900,
            color: slot.state === 'wrong' ? 'var(--accent2)' : 'var(--text)',
            background: slot.state === 'correct' && i < activeSlot ? 'transparent' : slot.state === 'active' ? 'rgba(42,122,75,0.06)' : 'var(--white)',
            transition: 'all 0.15s',
            animation: slot.state === 'wrong' ? 'shake 0.3s ease-in-out' : undefined,
          }}>
            {slot.letter.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Skip button */}
      {!celebrating && (
        <button onClick={skipWord}
          style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', padding: '8px 20px', cursor: 'pointer', borderRadius: 3, letterSpacing: '0.04em' }}>
          Skip word →
        </button>
      )}

      {/* Score */}
      <div style={{ position: 'absolute', bottom: 24, fontSize: 13, color: 'var(--muted)' }}>
        {sessionCorrect} correct this session
        {sessionTotal > 0 && sessionTotal > sessionCorrect && ` · ${sessionTotal - sessionCorrect} missed`}
      </div>
    </div>
  )
}
