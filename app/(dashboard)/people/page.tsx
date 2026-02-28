'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SITTER_COLORS = ['#E57373', '#F06292', '#BA68C8', '#64B5F6', '#4DB6AC', '#81C784', '#FFB74D', '#A1887F']

interface Sitter {
  id: string
  name: string
  color: string
  contact?: string
  rate_per_hour?: number
  notes?: string
}

interface Person {
  id: string
  name: string
  parent_name?: string
  child_name?: string
  child_grade?: string
  contact?: string
  type: string
  priority?: string
  last_date?: string
  status?: string
  notes?: string
}

export default function PeoplePage() {
  const [dinners, setDinners] = useState<Person[]>([])
  const [playdates, setPlaydates] = useState<Person[]>([])
  const [sitters, setSitters] = useState<Sitter[]>([])
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [d, p, s] = await Promise.all([
      supabase.from('people_crm').select('*').eq('type', 'dinner').order('name'),
      supabase.from('people_crm').select('*').eq('type', 'playdate').order('name'),
      supabase.from('sitters').select('*').order('name'),
    ])
    if (d.data) setDinners(d.data)
    if (p.data) setPlaydates(p.data)
    if (s.data) setSitters(s.data)
  }

  async function addSitter() {
    await supabase.from('sitters').insert({ name: 'New Sitter', color: SITTER_COLORS[sitters.length % SITTER_COLORS.length] })
    loadAll()
  }
  async function updateSitter(id: string, field: string, value: string | number) {
    await supabase.from('sitters').update({ [field]: value }).eq('id', id)
    loadAll()
  }
  async function deleteSitter(id: string) {
    await supabase.from('sitters').delete().eq('id', id)
    loadAll()
  }

  const PLAYDATE_STATUSES = ['pending', 'scheduled', 'overdue', 'confirmed']
  const PRIORITIES = ['low', 'medium', 'high']

  const STATUS_CLASS: Record<string, string> = {
    scheduled: 'badge-green', pending: 'badge-gold', overdue: 'badge-red', confirmed: 'badge-green',
  }
  const PRIORITY_CLASS: Record<string, string> = { high: 'badge-green', medium: 'badge-gold', low: 'badge-gray' }

  function CycleBadge({ value, options, colorMap, onCycle }: { value?: string; options: string[]; colorMap: Record<string, string>; onCycle: (v: string) => void }) {
    const v = value || options[0]
    const cls = colorMap[v] || 'badge-gray'
    function handleClick() {
      const idx = options.indexOf(v)
      const next = options[(idx + 1) % options.length]
      onCycle(next)
    }
    return (
      <button onClick={handleClick} className={`badge ${cls}`}
        style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
        title="Click to cycle">
        {v}
      </button>
    )
  }

  async function addDinner() {
    await supabase.from('people_crm').insert({ name: 'New Family', type: 'dinner', priority: 'medium' })
    loadAll()
  }

  async function addPlaydate() {
    await supabase.from('people_crm').insert({ name: 'New Kid', type: 'playdate', status: 'pending' })
    loadAll()
  }

  async function updatePerson(id: string, field: string, value: string) {
    await supabase.from('people_crm').update({ [field]: value }).eq('id', id)
    loadAll()
  }

  function EditCell({ value, onSave }: { value?: string; onSave: (v: string) => void }) {
    const [editing, setEditing] = useState(false)
    const [v, setV] = useState(value || '')
    if (editing) return (
      <input className="inline-input" autoFocus value={v} onChange={e => setV(e.target.value)}
        onBlur={() => { onSave(v); setEditing(false) }}
        onKeyDown={e => e.key === 'Enter' && (onSave(v), setEditing(false))}
      />
    )
    return <span onClick={() => setEditing(true)} style={{ cursor: 'text', minWidth: 40, display: 'inline-block' }}>{value || <span style={{ color: 'var(--border)' }}>—</span>}</span>
  }

  function SectionHeader({ title, sub, onAdd, addLabel }: { title: string; sub?: string; onAdd: () => void; addLabel: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div className="section-label">{title}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        <button onClick={onAdd} style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '5px 12px', cursor: 'pointer', borderRadius: 2 }}>
          {addLabel}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Dinner Targets */}
      <div>
        <SectionHeader title="Dinner Targets" sub="Families to host or visit" onAdd={addDinner} addLabel="+ Add Family" />
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Family / Parent</th>
              <th>Child &amp; Grade</th>
              <th>Contact</th>
              <th>Priority</th>
              <th>Notes</th>
            </tr></thead>
            <tbody>
              {dinners.map(p => (
                <tr key={p.id}>
                  <td><strong><EditCell value={p.name} onSave={v => updatePerson(p.id, 'name', v)} /></strong>
                    {p.parent_name && <><br /><span style={{ color: 'var(--muted)', fontSize: 11 }}><EditCell value={p.parent_name} onSave={v => updatePerson(p.id, 'parent_name', v)} /></span></>}
                  </td>
                  <td><EditCell value={p.child_name} onSave={v => updatePerson(p.id, 'child_name', v)} />{p.child_grade && <>, <EditCell value={p.child_grade} onSave={v => updatePerson(p.id, 'child_grade', v)} /></>}</td>
                  <td><EditCell value={p.contact} onSave={v => updatePerson(p.id, 'contact', v)} /></td>
                  <td><CycleBadge value={p.priority} options={PRIORITIES} colorMap={PRIORITY_CLASS} onCycle={v => updatePerson(p.id, 'priority', v)} /></td>
                  <td><EditCell value={p.notes} onSave={v => updatePerson(p.id, 'notes', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Playdate Targets */}
      <div>
        <SectionHeader title="Playdate Targets" sub="Track when Benji last played with each friend" onAdd={addPlaydate} addLabel="+ Add Kid" />
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Child</th>
              <th>Parent</th>
              <th>Contact</th>
              <th>Last Date</th>
              <th>Status</th>
              <th>Notes</th>
            </tr></thead>
            <tbody>
              {playdates.map(p => (
                <tr key={p.id}>
                  <td><strong><EditCell value={p.name} onSave={v => updatePerson(p.id, 'name', v)} /></strong></td>
                  <td><EditCell value={p.parent_name} onSave={v => updatePerson(p.id, 'parent_name', v)} /></td>
                  <td><EditCell value={p.contact} onSave={v => updatePerson(p.id, 'contact', v)} /></td>
                  <td><EditCell value={p.last_date} onSave={v => updatePerson(p.id, 'last_date', v)} /></td>
                  <td><CycleBadge value={p.status} options={PLAYDATE_STATUSES} colorMap={STATUS_CLASS} onCycle={v => updatePerson(p.id, 'status', v)} /></td>
                  <td><EditCell value={p.notes} onSave={v => updatePerson(p.id, 'notes', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sitter CRM */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div className="section-label">Sitter CRM</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Manage sitters and their colors — bookings live on the Calendar</div>
          </div>
          <button onClick={addSitter} style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '5px 12px', cursor: 'pointer', borderRadius: 2 }}>
            + Add Sitter
          </button>
        </div>
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Color</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Rate / hr</th>
              <th>Notes</th>
              <th style={{ width: 28 }}></th>
            </tr></thead>
            <tbody>
              {sitters.length === 0 && (
                <tr><td colSpan={6} style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '16px 12px' }}>No sitters yet</td></tr>
              )}
              {sitters.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {[SITTER_COLORS.slice(0, 4), SITTER_COLORS.slice(4)].map((row, ri) => (
                        <div key={ri} style={{ display: 'flex', gap: 3 }}>
                          {row.map(c => (
                            <button key={c} onClick={() => updateSitter(s.id, 'color', c)}
                              style={{ width: 12, height: 12, borderRadius: '50%', background: c, border: s.color === c ? '2px solid var(--text)' : '1.5px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                      <strong><EditCell value={s.name} onSave={v => updateSitter(s.id, 'name', v)} /></strong>
                    </span>
                  </td>
                  <td><EditCell value={s.contact} onSave={v => updateSitter(s.id, 'contact', v)} /></td>
                  <td><EditCell value={s.rate_per_hour != null ? String(s.rate_per_hour) : ''} onSave={v => updateSitter(s.id, 'rate_per_hour', parseFloat(v) || 0)} /></td>
                  <td><EditCell value={s.notes} onSave={v => updateSitter(s.id, 'notes', v)} /></td>
                  <td><button onClick={() => deleteSitter(s.id)} style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
