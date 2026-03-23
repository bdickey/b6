'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// Real animal/object audio files (Wikimedia Commons, public domain)
const WORD_AUDIO: Record<string, string> = {
  cat:   'https://upload.wikimedia.org/wikipedia/commons/8/81/Meow_of_a_Siamese_cat_-_freemaster2.wav',
  dog:   'https://upload.wikimedia.org/wikipedia/commons/1/1c/Perro_ladrando.ogg',
  bee:   'https://upload.wikimedia.org/wikipedia/commons/1/11/263673_ylearkisto_mehilainen-tarhamehilainen-parvi-bees-honeybees-a-swarm-of-bees-buzzing-among-the-flowers-apis-mellifera.wav',
  bear:  'https://upload.wikimedia.org/wikipedia/commons/4/4e/Bear_growl.ogg',
  bird:  'https://upload.wikimedia.org/wikipedia/commons/3/30/Common_Blackbird_song_%28Turdus_merula%29.ogg',
  frog:  'https://upload.wikimedia.org/wikipedia/commons/5/51/Frogs_croak_calling_chorus_at_night.ogg',
  duck:  'https://upload.wikimedia.org/wikipedia/commons/e/e2/Aix_sponsa_-_Wood_Duck_XC63109.mp3',
  lion:  'https://upload.wikimedia.org/wikipedia/commons/8/88/Lion_Mad.ogg',
  wolf:  'https://upload.wikimedia.org/wikipedia/commons/8/87/Wolf_howls.ogg',
  horse: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Wiehern.ogg',
  tiger: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Tiger_Mad.ogg',
  whale: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Whales_and_Dolphins_whale_nature_sounds_songs_nueva_esparta.ogg',
  sheep: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Sheep_bleating.ogg',
  snake: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Rattlesnake.ogg',
  eagle: 'https://upload.wikimedia.org/wikipedia/commons/9/92/Falco_amurensis_-_Amur_Falcon_XC342709.mp3',
  cow:   'https://upload.wikimedia.org/wikipedia/commons/7/71/Sound_Ideas%2C_COW_-_SINGLE_MOO%2C_ANIMAL_02.wav',
}

// TTS fallbacks for words without real audio
const TTS_SOUNDS: Record<string, { text: string; pitch?: number; rate?: number }> = {
  fish:  { text: 'blub blub blub!', pitch: 1.2, rate: 0.9 },
  panda: { text: 'squeak squeak!', pitch: 1.6, rate: 1.0 },
  bunny: { text: 'squeak squeak!', pitch: 1.7, rate: 1.1 },
  shark: { text: 'dun dun dun dun!', pitch: 0.5, rate: 0.8 },
  snail: { text: 'slurp slurp!', pitch: 0.9, rate: 0.5 },
  drum:  { text: 'boom boom boom!', pitch: 0.5, rate: 0.9 },
  bell:  { text: 'ding ding ding!', pitch: 1.8, rate: 1.0 },
  sun:   { text: 'ahhhhh so warm!', pitch: 1.2, rate: 0.8 },
  rain:  { text: 'pitter patter pitter patter!', pitch: 1.3, rate: 1.2 },
  wind:  { text: 'whoooooosh!', pitch: 1.1, rate: 0.7 },
  moon:  { text: 'oooooh spooky!', pitch: 0.8, rate: 0.6 },
  star:  { text: 'twinkle twinkle!', pitch: 1.6, rate: 0.9 },
  tree:  { text: 'rustle rustle rustle!', pitch: 1.0, rate: 0.9 },
  rose:  { text: 'sniff sniff ahhh!', pitch: 1.2, rate: 0.9 },
  grape: { text: 'squish squish!', pitch: 1.1, rate: 1.0 },
  cake:  { text: 'yummmm yummm!', pitch: 1.3, rate: 0.9 },
  apple: { text: 'crunch crunch crunch!', pitch: 1.1, rate: 1.1 },
  lemon: { text: 'sour! blegh!', pitch: 1.5, rate: 1.0 },
  milk:  { text: 'glug glug glug!', pitch: 1.1, rate: 1.0 },
  corn:  { text: 'crunch crunch!', pitch: 1.0, rate: 1.1 },
  hat:   { text: 'ta daaa!', pitch: 1.3, rate: 1.0 },
  kite:  { text: 'whoooosh!', pitch: 1.2, rate: 0.8 },
  boat:  { text: 'splash splash splash!', pitch: 1.0, rate: 1.0 },
  door:  { text: 'creeeak! bang!', pitch: 0.8, rate: 0.8 },
  flag:  { text: 'flap flap flap!', pitch: 1.1, rate: 1.1 },
  ball:  { text: 'boing boing boing!', pitch: 1.4, rate: 1.2 },
  fist:  { text: 'pow! wham!', pitch: 0.8, rate: 1.1 },
  gift:  { text: 'ooooh wow! yaaay!', pitch: 1.5, rate: 1.0 },
  lamp:  { text: 'click! ahhhh!', pitch: 1.3, rate: 1.0 },
  nest:  { text: 'tweet tweet tweet!', pitch: 1.7, rate: 1.2 },
  sand:  { text: 'swoooosh!', pitch: 1.0, rate: 0.8 },
  blue:  { text: 'ooooh so blue!', pitch: 1.2, rate: 0.9 },
}

const FALLBACK_TTS = [
  { text: 'WAHOOOO!', pitch: 1.6, rate: 1.1 },
  { text: 'YEEEHAW!', pitch: 1.4, rate: 1.0 },
  { text: 'BOOOOOM!', pitch: 0.4, rate: 0.7 },
  { text: 'ZAP ZAP ZAP!', pitch: 1.7, rate: 1.3 },
  { text: 'KAPOW!', pitch: 1.0, rate: 1.1 },
]

// Skip past any silence/intro in each audio file (seconds)
const AUDIO_START_AT: Record<string, number> = {
  bee:   0.8,
  bird:  0.6,
  frog:  0.5,
  duck:  0.4,
  wolf:  0.3,
  whale: 1.2,
  eagle: 0.5,
}

// Preload cache — populated on mount so audio plays instantly
const audioCache: Record<string, HTMLAudioElement> = {}

function preloadAudio() {
  if (typeof window === 'undefined') return
  Object.entries(WORD_AUDIO).forEach(([word, url]) => {
    if (!audioCache[word]) {
      const a = new Audio(url)
      a.preload = 'auto'
      a.load()
      audioCache[word] = a
    }
  })
}

let currentAudio: HTMLAudioElement | null = null
let audioStopTimer: ReturnType<typeof setTimeout> | null = null
const MAX_SOUND_MS = 2200

function playWordSound(word: string) {
  if (typeof window === 'undefined') return

  if (audioStopTimer) { clearTimeout(audioStopTimer); audioStopTimer = null }
  if (currentAudio) { currentAudio.pause() }
  window.speechSynthesis?.cancel()

  const audioUrl = WORD_AUDIO[word]
  if (audioUrl) {
    // Use preloaded instance; reset to skip-point so it plays immediately
    const audio = audioCache[word] ?? new Audio(audioUrl)
    audio.currentTime = AUDIO_START_AT[word] ?? 0
    audio.volume = 1.0
    currentAudio = audio
    audio.play().catch(() => playTTS(word))
    audioStopTimer = setTimeout(() => { audio.pause() }, MAX_SOUND_MS)
    return
  }
  playTTS(word)
}

function playTTS(word: string) {
  if (!window.speechSynthesis) return
  const sound = TTS_SOUNDS[word] ?? FALLBACK_TTS[Math.floor(Math.random() * FALLBACK_TTS.length)]
  setTimeout(() => {
    window.speechSynthesis.cancel()
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(sound.text)
      u.pitch = sound.pitch ?? 1.0
      u.rate = sound.rate ?? 1.0
      u.volume = 1.0
      window.speechSynthesis.speak(u)
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

const YT_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY // reusing Google key — needs YouTube Data API v3 enabled

async function fetchYouTubeVideo(word: string): Promise<string | null> {
  if (!YT_KEY) return null
  try {
    const q = encodeURIComponent(`${word} animal sound`)
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=1&videoDuration=short&safeSearch=strict&key=${YT_KEY}`
    )
    const data = await res.json()
    return data?.items?.[0]?.id?.videoId ?? null
  } catch {
    return null
  }
}

const PALETTES = [
  { bg: '#fff9f0', header: '#f97316', tile: '#ffedd5', text: '#7c2d12' },
  { bg: '#f0fdf4', header: '#16a34a', tile: '#dcfce7', text: '#14532d' },
  { bg: '#eff6ff', header: '#2563eb', tile: '#dbeafe', text: '#1e3a8a' },
  { bg: '#fdf4ff', header: '#9333ea', tile: '#f3e8ff', text: '#581c87' },
  { bg: '#fff1f2', header: '#e11d48', tile: '#ffe4e6', text: '#881337' },
  { bg: '#f0fdfa', header: '#0d9488', tile: '#ccfbf1', text: '#134e4a' },
  { bg: '#fefce8', header: '#ca8a04', tile: '#fef9c3', text: '#713f12' },
  { bg: '#f8fafc', header: '#475569', tile: '#e2e8f0', text: '#0f172a' },
]

function randomPalette() {
  return PALETTES[Math.floor(Math.random() * PALETTES.length)]
}

function pickRandom(exclude?: string) {
  const pool = exclude ? SPELL_WORDS.filter(w => w.word !== exclude) : SPELL_WORDS
  return pool[Math.floor(Math.random() * pool.length)]
}

interface PileItem {
  word: string
  emoji: string
  count: number
  pos: { top: number; left: number }
  id: number
}

export default function SpellingGame() {
  const [current, setCurrent] = useState(() => pickRandom())
  const [slots, setSlots] = useState<SlotState[]>([])
  const [activeSlot, setActiveSlot] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [scorePile, setScorePile] = useState<PileItem[]>([])
  const [poppingId, setPoppingId] = useState<number | null>(null)
  const [palette, setPalette] = useState(() => randomPalette())
  const [videoId, setVideoId] = useState<string | null>(null)
  const [showVideo, setShowVideo] = useState(false)
  const supabase = createClient()

  // Preload all audio on mount
  useEffect(() => { preloadAudio() }, [])

  const loadWord = useCallback((word: string) => {
    setSlots(word.split('').map((_, i) => ({ letter: '', state: i === 0 ? 'active' : 'blank' })))
    setActiveSlot(0)
    setCelebrating(false)
    setPalette(randomPalette())
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
          setLastCorrect(current)
          playWordSound(current.word)
          fetchYouTubeVideo(current.word).then(id => {
            if (id) { setVideoId(id); setShowVideo(true) }
          })
          setTimeout(() => setShowVideo(false), 4500)
          setSessionCorrect(c => {
            const newCount = c + 1
            const newItem: PileItem = {
              word: current.word,
              emoji: current.emoji,
              count: newCount,
              pos: randomPos(),
              id: Date.now(),
            }
            setScorePile(prev => [...prev, newItem])
            setPoppingId(newItem.id)
            setTimeout(() => setPoppingId(null), 700)
            return newCount
          })
          setSessionTotal(t => t + 1)
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
      background: palette.bg,
      transition: 'background 0.4s ease',
    }}>
      {/* Emoji — clickable as sound hint */}
      <div
        onClick={() => playWordSound(current.word)}
        title="Click to hear the sound!"
        style={{
          fontSize: 130, lineHeight: 1, marginBottom: 8, cursor: 'pointer',
          animation: celebrating ? 'bounce-emoji 0.4s ease-in-out 3' : undefined,
          filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.12))',
        }}
      >
        {current.emoji}
      </div>

      {/* Hint */}
      <div style={{ fontSize: 16, color: palette.text, opacity: 0.7, marginBottom: 32, letterSpacing: '0.02em' }}>
        {celebrating ? '🎉 NICE JOB!' : current.hint}
      </div>

      {/* Letter tiles */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
        {slots.map((slot, i) => (
          <div key={i} style={{
            width: 72, height: 72,
            border: `3px solid ${slot.state === 'wrong' ? '#e11d48' : slot.state !== 'blank' ? palette.header : palette.tile}`,
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 900,
            color: slot.state === 'wrong' ? '#e11d48' : palette.text,
            background: slot.state === 'active' ? palette.tile : slot.state === 'correct' ? palette.tile : '#fff',
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
          style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: palette.text, opacity: 0.5, background: 'none', border: `1px solid ${palette.tile}`, padding: '8px 20px', cursor: 'pointer', borderRadius: 3, letterSpacing: '0.04em' }}>
          Skip word →
        </button>
      )}

      {/* YouTube video popup on correct answer */}
      {showVideo && videoId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1080,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          animation: 'benji-intro-in 0.3s ease-out',
        }} onClick={() => setShowVideo(false)}>
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', width: 'min(480px, 90vw)', aspectRatio: '16/9' }}>
            <iframe
              width="100%" height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&start=0`}
              allow="autoplay"
              style={{ border: 'none', display: 'block' }}
            />
          </div>
          <div style={{ position: 'absolute', top: 24, right: 24, color: '#fff', fontSize: 13, fontWeight: 600, opacity: 0.7 }}>tap anywhere to close</div>
        </div>
      )}

      {/* Score pile — all correct answers stay on screen */}
      {scorePile.map(item => (
        <div
          key={item.id}
          onClick={() => playWordSound(item.word)}
          style={{
            position: 'fixed',
            top: `${item.pos.top}vh`,
            left: `${item.pos.left}vw`,
            zIndex: 1055,
            cursor: 'pointer',
            userSelect: 'none',
            lineHeight: 1,
            animation: poppingId === item.id ? 'score-pop 0.7s cubic-bezier(0.34,1.56,0.64,1)' : undefined,
          }}
        >
          <div style={{ fontSize: 36, lineHeight: 1, textAlign: 'center', marginBottom: 2 }}>
            {item.emoji}
          </div>
          <div style={{
            fontSize: 'clamp(56px, 8vw, 110px)',
            fontWeight: 900,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: palette.header,
            WebkitTextStroke: '2px rgba(0,0,0,0.08)',
            lineHeight: 0.9,
            textAlign: 'center',
          }}>
            {item.count}
          </div>
        </div>
      ))}
    </div>
  )
}
