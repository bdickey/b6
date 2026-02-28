'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/home')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ width: 360 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Family Command Center
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Benji HQ
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px 28px' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: 14,
                  border: '1px solid var(--border)',
                  borderRadius: 2,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: 14,
                  border: '1px solid var(--border)',
                  borderRadius: 2,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {error && (
              <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--accent2)', padding: '8px 12px', background: '#fde8e5', borderRadius: 2 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                background: loading ? 'var(--muted)' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 2,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.05em',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
