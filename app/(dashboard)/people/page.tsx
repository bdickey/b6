'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

interface AfterschoolProgram {
  id: string
  name: string
  day_time?: string
  location?: string
  cost?: string
  status: string
}

interface FamilyEvent {
  id: string
  date: string
  name: string
  who?: string
  notes?: string
}

export default function PeoplePage() {
  const [dinners, setDinners] = useState<Person[]>([])
  const [playdates, setPlaydates] = useState<Person[]>([])
  const [programs, setPrograms] = useState<AfterschoolProgram[]>([])
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([])
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [d, p, pr, fe] = await Promise.all([
      supabase.from('people_crm').select('*').eq('type', 'dinner').order('name'),
      supabase.from('people_crm').select('*').eq('type', 'playdate').order('name'),
      supabase.from('afterschool_programs').select('*').order('name'),
      supabase.from('family_events').select('*').order('date'),
    ])
    if (d.data) setDinners(d.data)
    if (p.data) setPlaydates(p.data)
    if (pr.data) setPrograms(pr.data)
    if (fe.data) setFamilyEvents(fe.data)
  }

  const PROGRAM_STATUSES = ['consider', 'waitlist', 'enrolled']
  const PLAYDATE_STATUSES = ['pending', 'scheduled', 'overdue', 'confirmed']
  const PRIORITIES = ['low', 'medium', 'high']

  const STATUS_CLASS: Record<string, string> = {
    scheduled: 'badge-green', pending: 'badge-gold', overdue: 'badge-red',
    confirmed: 'badge-green', waitlist: 'badge-gold', enrolled: 'badge-green',
    consider: 'badge-gray',
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

  async function addProgram() {
    await supabase.from('afterschool_programs').insert({ name: 'New Program', status: 'consider' })
    loadAll()
  }

  async function addFamilyEvent() {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('family_events').insert({ date: today, name: 'New Event' })
    loadAll()
  }

  async function updatePerson(id: string, field: string, value: string) {
    await supabase.from('people_crm').update({ [field]: value }).eq('id', id)
    loadAll()
  }

  async function updateProgram(id: string, field: string, value: string) {
    await supabase.from('afterschool_programs').update({ [field]: value }).eq('id', id)
    loadAll()
  }

  async function updateFamilyEvent(id: string, field: string, value: string) {
    await supabase.from('family_events').update({ [field]: value }).eq('id', id)
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
              <th>Child & Grade</th>
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

      {/* Afterschool Programs */}
      <div>
        <SectionHeader title="Afterschool Programs" sub="Current and potential activities" onAdd={addProgram} addLabel="+ Add Program" />
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Program</th>
              <th>Day / Time</th>
              <th>Location</th>
              <th>Cost</th>
              <th>Status</th>
            </tr></thead>
            <tbody>
              {programs.map(pr => (
                <tr key={pr.id}>
                  <td><strong><EditCell value={pr.name} onSave={v => updateProgram(pr.id, 'name', v)} /></strong></td>
                  <td><EditCell value={pr.day_time} onSave={v => updateProgram(pr.id, 'day_time', v)} /></td>
                  <td><EditCell value={pr.location} onSave={v => updateProgram(pr.id, 'location', v)} /></td>
                  <td><EditCell value={pr.cost} onSave={v => updateProgram(pr.id, 'cost', v)} /></td>
                  <td><CycleBadge value={pr.status} options={PROGRAM_STATUSES} colorMap={STATUS_CLASS} onCycle={v => updateProgram(pr.id, 'status', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Family Events */}
      <div>
        <SectionHeader title="Family Events" sub="Upcoming events with family or class" onAdd={addFamilyEvent} addLabel="+ Add Event" />
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Date</th>
              <th>Event</th>
              <th>Who</th>
              <th>Notes</th>
            </tr></thead>
            <tbody>
              {familyEvents.map(fe => (
                <tr key={fe.id}>
                  <td><EditCell value={fe.date} onSave={v => updateFamilyEvent(fe.id, 'date', v)} /></td>
                  <td><strong><EditCell value={fe.name} onSave={v => updateFamilyEvent(fe.id, 'name', v)} /></strong></td>
                  <td><EditCell value={fe.who} onSave={v => updateFamilyEvent(fe.id, 'who', v)} /></td>
                  <td><EditCell value={fe.notes} onSave={v => updateFamilyEvent(fe.id, 'notes', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
