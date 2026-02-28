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

type CarpoolMatrix = Record<string, Record<string, string>>

const CARPOOL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const CARPOOL_SLOTS = ['AM', 'PM']

function defaultMatrix(): CarpoolMatrix {
  const m: CarpoolMatrix = {}
  CARPOOL_DAYS.forEach(d => { m[d] = { AM: '', PM: '' } })
  return m
}

function generateCarpoolText(matrix: CarpoolMatrix): string {
  const lines: string[] = []
  CARPOOL_DAYS.forEach(day => {
    const am = matrix[day]?.AM || '—'
    const pm = matrix[day]?.PM || '—'
    lines.push(`${day}: AM → ${am}  |  PM → ${pm}`)
  })
  return lines.join('\n')
}

export default function AdminPage() {
  const [sitters, setSitters] = useState<Sitter[]>([])
  const [bookings, setBookings] = useState<SitterBooking[]>([])
  const [vault, setVault] = useState<VaultItem[]>([])
  const [carpoolMatrix, setCarpoolMatrix] = useState<CarpoolMatrix>(defaultMatrix())
  const [carpoolPeople, setCarpoolPeople] = useState<string[]>([])
  const [newPerson, setNewPerson] = useState('')
  const [carpoolCopied, setCarpoolCopied] = useState(false)
  const [revealedVault, setRevealedVault] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const today = new Date().toISOString().split('T')[0]
    const [s, b, v, cm, cp] = await Promise.all([
      supabase.from('sitters').select('*').order('name'),
      supabase.from('sitter_bookings').select('*, sitters(name)').gte('date', today).order('date').limit(10),
      supabase.from('vault_items').select('*'),
      supabase.from('app_settings').select('*').eq('key', 'carpool_matrix').single(),
      supabase.from('app_settings').select('*').eq('key', 'carpool_people').single(),
    ])
    if (s.data) setSitters(s.data)
    if (b.data) setBookings(b.data)
    if (v.data) setVault(v.data)
    if (cm.data?.value) { try { setCarpoolMatrix(JSON.parse(cm.data.value)) } catch {} }
    if (cp.data?.value) { try { setCarpoolPeople(JSON.parse(cp.data.value)) } catch {} }
  }

  async function saveMatrix(matrix: CarpoolMatrix) {
    await supabase.from('app_settings').upsert({ key: 'carpool_matrix', value: JSON.stringify(matrix) }, { onConflict: 'key' })
  }

  async function savePeople(people: string[]) {
    await supabase.from('app_settings').upsert({ key: 'carpool_people', value: JSON.stringify(people) }, { onConflict: 'key' })
  }

  function setCarpoolCell(day: string, slot: string, value: string) {
    const next = { ...carpoolMatrix, [day]: { ...carpoolMatrix[day], [slot]: value } }
    setCarpoolMatrix(next)
    saveMatrix(next)
  }

  function addPerson() {
    if (!newPerson.trim()) return
    const next = [...carpoolPeople, newPerson.trim()]
    setCarpoolPeople(next)
    savePeople(next)
    setNewPerson('')
  }

  function removePerson(name: string) {
    const next = carpoolPeople.filter(p => p !== name)
    setCarpoolPeople(next)
    savePeople(next)
  }

  function copyCarpoolText() {
    navigator.clipboard.writeText(generateCarpoolText(carpoolMatrix))
    setCarpoolCopied(true)
    setTimeout(() => setCarpoolCopied(false), 2000)
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

  function toggleReveal(id: string) {
    setRevealedVault(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const dropdownStyle: React.CSSProperties = {
    fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
    background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 2, padding: '4px 6px', cursor: 'pointer', outline: 'none',
    width: '100%',
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

          {/* People list */}
          <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {carpoolPeople.map(p => (
              <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: 'rgba(42,122,75,0.08)', color: 'var(--accent)', border: '1px solid rgba(42,122,75,0.2)', borderRadius: 2, padding: '2px 8px' }}>
                {p}
                <button onClick={() => removePerson(p)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: '0 0 0 2px', lineHeight: 1 }}>×</button>
              </span>
            ))}
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={newPerson}
                onChange={e => setNewPerson(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPerson()}
                placeholder="Add person…"
                style={{ fontFamily: 'inherit', fontSize: 11, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 2, padding: '3px 8px', outline: 'none', width: 110 }}
              />
              <button onClick={addPerson}
                style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '3px 8px', borderRadius: 2 }}>+</button>
            </div>
          </div>

          {/* Matrix */}
          <div className="card">
            <table className="hl-table">
              <thead>
                <tr>
                  <th></th>
                  {CARPOOL_DAYS.map(d => <th key={d}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {CARPOOL_SLOTS.map(slot => (
                  <tr key={slot}>
                    <td style={{ fontWeight: 700, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em' }}>{slot}</td>
                    {CARPOOL_DAYS.map(day => (
                      <td key={day}>
                        <select
                          value={carpoolMatrix[day]?.[slot] || ''}
                          onChange={e => setCarpoolCell(day, slot, e.target.value)}
                          style={dropdownStyle}
                        >
                          <option value="">—</option>
                          {carpoolPeople.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Preview</div>
            <pre style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--text)', margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {generateCarpoolText(carpoolMatrix)}
            </pre>
          </div>
        </div>

        {/* Legal & Sensitive Vault */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div className="section-label">Legal & Sensitive Vault</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Click to reveal. Don&apos;t store real passwords.</div>
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
                          cursor: 'pointer', fontSize: 12, borderRadius: 1, minWidth: 60,
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
