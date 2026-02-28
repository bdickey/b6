'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Sitter {
  id: string
  name: string
  contact?: string
  rate_per_hour?: number
  availability?: string
  rating?: number
  notes?: string
}

interface SitterBooking {
  id: string
  sitter_id: string
  date: string
  start_time?: string
  end_time?: string
  hours?: number
  total?: number
  status: string
  payment_method?: string
  sitters?: { name: string }
}

interface VaultItem {
  id: string
  document: string
  value_hint?: string
  expiry?: string
  location?: string
}

interface AppSetting {
  key: string
  value: string
}

export default function AdminPage() {
  const [sitters, setSitters] = useState<Sitter[]>([])
  const [bookings, setBookings] = useState<SitterBooking[]>([])
  const [vault, setVault] = useState<VaultItem[]>([])
  const [carpoolText, setCarpoolText] = useState('')
  const [carpoolCopied, setCarpoolCopied] = useState(false)
  const [revealedVault, setRevealedVault] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const today = new Date().toISOString().split('T')[0]
    const [s, b, v, c] = await Promise.all([
      supabase.from('sitters').select('*').order('name'),
      supabase.from('sitter_bookings').select('*, sitters(name)').gte('date', today).order('date').limit(10),
      supabase.from('vault_items').select('*'),
      supabase.from('app_settings').select('*').eq('key', 'carpool_text').single(),
    ])
    if (s.data) setSitters(s.data)
    if (b.data) setBookings(b.data)
    if (v.data) setVault(v.data)
    if (c.data) setCarpoolText(c.data?.value || '')
  }

  function stars(rating?: number) {
    if (!rating) return null
    return <span style={{ color: 'var(--accent3)', letterSpacing: 1 }}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = { confirmed: 'badge-green', tentative: 'badge-gold', past: 'badge-gray' }
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
  }

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  async function addSitter() {
    await supabase.from('sitters').insert({ name: 'New Sitter', rating: 5 })
    loadAll()
  }

  async function addVaultItem() {
    await supabase.from('vault_items').insert({ document: 'New Document', value_hint: '••••' })
    loadAll()
  }

  async function saveCarpoolText(text: string) {
    await supabase.from('app_settings').upsert({ key: 'carpool_text', value: text }, { onConflict: 'key' })
  }

  function toggleReveal(id: string) {
    setRevealedVault(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function copyCarpoolText() {
    navigator.clipboard.writeText(carpoolText)
    setCarpoolCopied(true)
    setTimeout(() => setCarpoolCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Sitter CRM */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="section-label">Sitter CRM</div>
          <button onClick={addSitter} style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '5px 12px', cursor: 'pointer', borderRadius: 2 }}>+ Add Sitter</button>
        </div>
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Rate / hr</th>
              <th>Availability</th>
              <th>Rating</th>
              <th>Notes</th>
            </tr></thead>
            <tbody>
              {sitters.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td style={{ color: 'var(--mid)' }}>{s.contact || '—'}</td>
                  <td>{s.rate_per_hour ? `$${s.rate_per_hour}/hr` : '—'}</td>
                  <td style={{ color: 'var(--mid)', fontSize: 12 }}>{s.availability || '—'}</td>
                  <td>{stars(s.rating)}</td>
                  <td style={{ color: 'var(--mid)', fontSize: 12 }}>{s.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Bookings */}
      <div>
        <div className="section-label" style={{ marginBottom: 8 }}>Upcoming Bookings</div>
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Date</th>
              <th>Sitter</th>
              <th>Time</th>
              <th>Hours</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
            </tr></thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={7} style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px' }}>No upcoming bookings</td></tr>
              ) : bookings.map(b => (
                <tr key={b.id}>
                  <td>{formatDate(b.date)}</td>
                  <td><strong>{(b.sitters as any)?.name || '—'}</strong></td>
                  <td style={{ fontSize: 12 }}>{b.start_time} – {b.end_time}</td>
                  <td>{b.hours ? `${b.hours}h` : '—'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{b.total ? `$${b.total}` : '—'}</td>
                  <td>{statusBadge(b.status)}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{b.payment_method || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Carpool Planner */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="section-label">Carpool Planner</div>
            <button onClick={copyCarpoolText}
              style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: carpoolCopied ? 'var(--muted)' : 'var(--accent)', border: 'none', padding: '5px 12px', cursor: 'pointer', borderRadius: 2 }}>
              {carpoolCopied ? '✓ Copied' : 'Copy Text'}
            </button>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <textarea
              value={carpoolText}
              onChange={e => setCarpoolText(e.target.value)}
              onBlur={() => saveCarpoolText(carpoolText)}
              rows={8}
              placeholder="Paste your carpool schedule text here…"
              style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* Legal & Sensitive Vault */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div className="section-label">Legal & Sensitive Vault</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Hover or click to reveal. Don&apos;t store real passwords.</div>
            </div>
            <button onClick={addVaultItem} style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '5px 12px', cursor: 'pointer', borderRadius: 2 }}>+ Add</button>
          </div>
          <div className="card">
            <table className="hl-table">
              <thead><tr>
                <th>Document</th>
                <th>Value</th>
                <th>Expiry</th>
                <th>Location</th>
              </tr></thead>
              <tbody>
                {vault.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.document}</strong></td>
                    <td>
                      <span
                        onClick={() => toggleReveal(v.id)}
                        style={{
                          display: 'inline-block',
                          background: revealedVault.has(v.id) ? 'var(--mid)' : 'var(--text)',
                          color: revealedVault.has(v.id) ? 'var(--white)' : 'var(--text)',
                          height: revealedVault.has(v.id) ? 'auto' : 14,
                          padding: revealedVault.has(v.id) ? '0 4px' : '0',
                          cursor: 'pointer',
                          fontSize: 12,
                          borderRadius: 1,
                          minWidth: 60,
                        }}
                      >
                        {revealedVault.has(v.id) ? v.value_hint : ''}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }}>{v.expiry || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--mid)' }}>{v.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
