'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Sound phrases spoken aloud when Benji gets the word right
const WORD_SOUNDS: Record<string, { text: string; pitch?: number; rate?: number }> = {
  // Animals
  cat:    { text: 'meow meow meow!', pitch: 1.4, rate: 1.1 },
  dog:    { text: 'woof woof woof!', pitch: 0.9, rate: 1.0 },
  bee:    { text: 'bzzzzzzz!', pitch: 1.8, rate: 1.4 },
  bear:   { text: 'grooowl!', pitch: 0.5, rate: 0.7 },
  bird:   { text: 'tweet tweet tweet!', pitch: 1.7, rate: 1.3 },
  fish:   { text: 'blub blub blub!', pitch: 1.2, rate: 0.9 },
  frog:   { text: 'ribbit ribbit ribbit!', pitch: 1.1, rate: 1.0 },
  duck:   { text: 'quack quack quack!', pitch: 1.2, rate: 1.1 },
  lion:   { text: 'ROAAAAR!', pitch: 0.4, rate: 0.6 },
  wolf:   { text: 'awooooooo!', pitch: 0.6, rate: 0.6 },
  horse:  { text: 'neigh!', pitch: 1.1, rate: 0.9 },
  tiger:  { text: 'ROAAAAR!', pitch: 0.45, rate: 0.65 },
  whale:  { text: 'ooooooh woooo!', pitch: 0.4, rate: 0.5 },
  panda:  { text: 'squeak squeak!', pitch: 1.6, rate: 1.0 },
  eagle:  { text: 'screeech!', pitch: 1.5, rate: 0.8 },
  sheep:  { text: 'baa baa baa!', pitch: 1.1, rate: 0.9 },
  snake:  { text: 'hissssss!', pitch: 0.8, rate: 0.7 },
  bunny:  { text: 'squeak squeak!', pitch: 1.7, rate: 1.1 },
  shark:  { text: 'dun dun dun dun!', pitch: 0.5, rate: 0.8 },
  snail:  { text: 'slurp slurp!', pitch: 0.9, rate: 0.5 },
  // Instruments & objects with sounds
  drum:   { text: 'boom boom boom!', pitch: 0.5, rate: 0.9 },
  bell:   { text: 'ding ding ding!', pitch: 1.8, rate: 1.0 },
  // Nature
  sun:    { text: 'ahhhhh so warm!', pitch: 1.2, rate: 0.8 },
  rain:   { text: 'pitter patter pitter patter!', pitch: 1.3, rate: 1.2 },
  wind:   { text: 'whoooooosh!', pitch: 1.1, rate: 0.7 },
  moon:   { text: 'oooooh spooky!', pitch: 0.8, rate: 0.6 },
  star:   { text: 'twinkle twinkle!', pitch: 1.6, rate: 0.9 },
  tree:   { text: 'rustle rustle rustle!', pitch: 1.0, rate: 0.9 },
  rose:   { text: 'sniff sniff ahhh!', pitch: 1.2, rate: 0.9 },
  grape:  { text: 'squish squish!', pitch: 1.1, rate: 1.0 },
  // Food
  cake:   { text: 'yummmm yummm!', pitch: 1.3, rate: 0.9 },
  apple:  { text: 'crunch crunch crunch!', pitch: 1.1, rate: 1.1 },
  lemon:  { text: 'sour! blegh!', pitch: 1.5, rate: 1.0 },
  milk:   { text: 'glug glug glug!', pitch: 1.1, rate: 1.0 },
  corn:   { text: 'crunch crunch!', pitch: 1.0, rate: 1.1 },
  // Objects
  hat:    { text: 'ta daaa!', pitch: 1.3, rate: 1.0 },
  kite:   { text: 'whoooosh!', pitch: 1.2, rate: 0.8 },
  boat:   { text: 'splash splash splash!', pitch: 1.0, rate: 1.0 },
  door:   { text: 'creeeak! bang!', pitch: 0.8, rate: 0.8 },
  flag:   { text: 'flap flap flap!', pitch: 1.1, rate: 1.1 },
  ball:   { text: 'boing boing boing!', pitch: 1.4, rate: 1.2 },
  fist:   { text: 'pow! wham!', pitch: 0.8, rate: 1.1 },
  gift:   { text: 'ooooh wow! yaaay!', pitch: 1.5, rate: 1.0 },
  lamp:   { text: 'click! ahhhh!', pitch: 1.3, rate: 1.0 },
  nest:   { text: 'tweet tweet tweet!', pitch: 1.7, rate: 1.2 },
  sand:   { text: 'swoooosh!', pitch: 1.0, rate: 0.8 },
  blue:   { text: 'ooooh so blue!', pitch: 1.2, rate: 0.9 },
}

const FALLBACK_SOUNDS = [
  { text: 'WAHOOOO!',      pitch: 1.6, rate: 1.1 },
  { text: 'YEEEHAW!',      pitch: 1.4, rate: 1.0 },
  { text: 'BOOOOOM!',      pitch: 0.4, rate: 0.7 },
  { text: 'ZAP ZAP ZAP!',  pitch: 1.7, rate: 1.3 },
  { text: 'KAPOW!',        pitch: 1.0, rate: 1.1 },
  { text: 'WUBWUBWUB!',    pitch: 0.5, rate: 1.4 },
  { text: 'SPLAT!',        pitch: 1.2, rate: 1.0 },
  { text: 'ZOOOOOOM!',     pitch: 1.3, rate: 0.8 },
  { text: 'BOING BOING BOING!', pitch: 1.5, rate: 1.2 },
  { text: 'NEEEEOW!',      pitch: 1.8, rate: 0.9 },
]

function playWordSound(word: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const sound = WORD_SOUNDS[word] ?? FALLBACK_SOUNDS[Math.floor(Math.random() * FALLBACK_SOUNDS.length)]
  // Small delay prevents Chrome speechSynthesis silent-fail bug
  setTimeout(() => {
    window.speechSynthesis.cancel()
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(sound.text)
      utterance.pitch = sound.pitch ?? 1.0
      utterance.rate = sound.rate ?? 1.0
      utterance.volume = 1.0
      window.speechSynthesis.speak(utterance)
    }, 50)
  }, 0)
}

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

function randomPos() {
  // Prefer corners/edges so the score doesn't cover the game center
  const zones = [
    [8, 18, 4, 16],   // top-left    [top-min, top-max, left-min, left-max]
    [8, 18, 72, 82],  // top-right
    [68, 78, 4, 16],  // bottom-left
    [68, 78, 70, 80], // bottom-right
    [38, 52, 3, 13],  // mid-left
    [38, 52, 76, 86], // mid-right
  ]
  const [t0, t1, l0, l1] = zones[Math.floor(Math.random() * zones.length)]
  return {
    top: t0 + Math.random() * (t1 - t0),
    left: l0 + Math.random() * (l1 - l0),
  }
}

function pickRandom(exclude?: string) {
  const pool = exclude ? SPELL_WORDS.filter(w => w.word !== exclude) : SPELL_WORDS
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function SpellingGame() {
  const [current, setCurrent] = useState(() => pickRandom())
  const [slots, setSlots] = useState<SlotState[]>([])
  const [activeSlot, setActiveSlot] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [scorePos, setScorePos] = useState({ top: 68, left: 4 })
  const [scorePopping, setScorePopping] = useState(false)
  const supabase = createClient()

  const loadWord = useCallback((word: string) => {
    setSlots(word.split('').map((_, i) => ({ letter: '', state: i === 0 ? 'active' : 'blank' })))
    setActiveSlot(0)
    setCelebrating(false)
  }, [])

  useEffect(() => {
    loadWord(current.word)
  }, [current, loadWord])

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
          playWordSound(current.word)
          setSessionCorrect(c => c + 1)
          setSessionTotal(t => t + 1)
          setScorePos(randomPos())
          setScorePopping(true)
          setTimeout(() => setScorePopping(false), 700)
          supabase.from('benji_spelling_log').insert({ correct: 1, total: 1 }).then(() => {})
          setTimeout(() => {
            setCurrent(prev => pickRandom(prev.word))
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
  }, [activeSlot, celebrating, current, supabase])

  function skipWord() {
    setCurrent(prev => pickRandom(prev.word))
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

      {/* Floating score counter */}
      {sessionCorrect > 0 && (
        <div style={{
          position: 'fixed',
          top: `${scorePos.top}vh`,
          left: `${scorePos.left}vw`,
          zIndex: 1055,
          pointerEvents: 'none',
          userSelect: 'none',
          lineHeight: 1,
          transition: 'top 0.55s cubic-bezier(0.34,1.56,0.64,1), left 0.55s cubic-bezier(0.34,1.56,0.64,1)',
          animation: scorePopping ? 'score-pop 0.7s cubic-bezier(0.34,1.56,0.64,1)' : undefined,
        }}>
          <div style={{
            fontSize: 'clamp(100px, 14vw, 180px)',
            fontWeight: 900,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: 'var(--accent)',
            WebkitTextStroke: '3px rgba(38,126,92,0.3)',
          }}>
            {sessionCorrect}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--mid)',
            textAlign: 'center', marginTop: -8,
          }}>
            correct
          </div>
        </div>
      )}
    </div>
  )
}
