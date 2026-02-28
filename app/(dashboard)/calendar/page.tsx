'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CalendarEvent {
  id: string
  date: string
  title: string
  type: string
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

interface AddEventForm {
  date: string
  title: string
  type: string
  notes: string
}

const PROGRAM_STATUSES = ['consider', 'waitlist', 'enrolled']
const PROGRAM_STATUS_CLASS: Record<string, string> = {
  enrolled: 'badge-green', waitlist: 'badge-gold', consider: 'badge-gray',
}

function parseProgramDays(dayTime?: string): number[] {
  if (!dayTime) return []
  const s = dayTime.toLowerCase()
  const days: number[] = []
  if (s.includes('sun')) days.push(0)
  if (s.includes('mon')) days.push(1)
  if (s.includes('tue')) days.push(2)
  if (s.includes('wed')) days.push(3)
  if (s.includes('thu')) days.push(4)
  if (s.includes('fri')) days.push(5)
  if (s.includes('sat')) days.push(6)
  return days
}

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

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [programs, setPrograms] = useState<AfterschoolProgram[]>([])
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([])
  const [modal, setModal] = useState<{ open: boolean; date: string; event?: CalendarEvent } | null>(null)
  const [form, setForm] = useState<AddEventForm>({ date: '', title: '', type: 'default', notes: '' })
  const supabase = createClient()

  const today = new Date()

  useEffect(() => { loadAll() }, [year, month])

  async function loadAll() {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
    const [evRes, prRes, feRes] = await Promise.all([
      supabase.from('calendar_events').select('*').gte('date', start).lte('date', end),
      supabase.from('afterschool_programs').select('*').order('name'),
      supabase.from('family_events').select('*').order('date'),
    ])
    if (evRes.data) setEvents(evRes.data)
    if (prRes.data) setPrograms(prRes.data)
    if (feRes.data) setFamilyEvents(feRes.data)
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function openAdd(dateStr: string) {
    setForm({ date: dateStr, title: '', type: 'default', notes: '' })
    setModal({ open: true, date: dateStr })
  }

  function openEdit(ev: CalendarEvent) {
    setForm({ date: ev.date, title: ev.title, type: ev.type, notes: ev.notes || '' })
    setModal({ open: true, date: ev.date, event: ev })
  }

  async function saveEvent() {
    if (!form.title.trim()) return
    if (modal?.event) {
      await supabase.from('calendar_events').update({ title: form.title, type: form.type, notes: form.notes }).eq('id', modal.event.id)
    } else {
      await supabase.from('calendar_events').insert({ date: form.date, title: form.title, type: form.type, notes: form.notes })
    }
    setModal(null)
    loadAll()
  }

  async function deleteEvent(id: string) {
    await supabase.from('calendar_events').delete().eq('id', id)
    setModal(null)
    loadAll()
  }

  async function addProgram() {
    await supabase.from('afterschool_programs').insert({ name: 'New Program', status: 'consider' })
    loadAll()
  }

  async function updateProgram(id: string, field: string, value: string) {
    await supabase.from('afterschool_programs').update({ [field]: value }).eq('id', id)
    loadAll()
  }

  async function deleteProgram(id: string) {
    await supabase.from('afterschool_programs').delete().eq('id', id)
    loadAll()
  }

  async function addFamilyEvent() {
    const todayStr = new Date().toISOString().split('T')[0]
    await supabase.from('family_events').insert({ date: todayStr, name: 'New Event' })
    loadAll()
  }

  async function updateFamilyEvent(id: string, field: string, value: string) {
    await supabase.from('family_events').update({ [field]: value }).eq('id', id)
    loadAll()
  }

  async function deleteFamilyEvent(id: string) {
    await supabase.from('family_events').delete().eq('id', id)
    loadAll()
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const cells: Array<{ day: number; current: boolean; dateStr: string; dow: number }> = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, current: false, dateStr, dow: new Date(dateStr + 'T12:00:00').getDay() })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, current: true, dateStr, dow: new Date(dateStr + 'T12:00:00').getDay() })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 1 : month + 2
    const y = month === 11 ? year + 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, current: false, dateStr, dow: new Date(dateStr + 'T12:00:00').getDay() })
  }

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function eventColor(type: string) {
    if (type === 'red') return { bg: 'var(--accent2)', color: '#fff' }
    if (type === 'gold') return { bg: 'var(--accent3)', color: '#4A3500' }
    return { bg: 'var(--accent)', color: '#fff' }
  }

  function todayDateStr() {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }

  // Get enrolled/waitlist programs visible on calendar
  const activePrograms = programs.filter(pr => pr.status === 'enrolled' || pr.status === 'waitlist')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} style={{ fontFamily: 'inherit', fontSize: 18, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px', borderRadius: 2 }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text)', minWidth: 180, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={{ fontFamily: 'inherit', fontSize: 18, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px', borderRadius: 2 }}>›</button>
        </div>
        <button
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
          style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '5px 12px', borderRadius: 2 }}
        >
          Today
        </button>
      </div>

      {/* Grid */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--white)' }}>
          <thead>
            <tr>
              {DAYS.map(d => (
                <th key={d} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', padding: '10px 14px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--bg)', textAlign: 'left' }}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, row) => (
              <tr key={row}>
                {cells.slice(row * 7, row * 7 + 7).map((cell, col) => {
                  const isToday = cell.current && cell.dateStr === todayDateStr()
                  const cellEvents = events.filter(ev => ev.date === cell.dateStr)
                  const cellFamilyEvents = familyEvents.filter(fe => fe.date === cell.dateStr)
                  const cellPrograms = cell.current
                    ? activePrograms.filter(pr => parseProgramDays(pr.day_time).includes(cell.dow))
                    : []
                  return (
                    <td
                      key={col}
                      onClick={() => cell.current && openAdd(cell.dateStr)}
                      style={{
                        width: 'calc(100%/7)', minHeight: 90, height: 90, verticalAlign: 'top',
                        padding: '10px 14px', borderRight: col < 6 ? '1px solid var(--border)' : 'none',
                        borderBottom: row < 5 ? '1px solid var(--border)' : 'none',
                        background: !cell.current ? 'rgba(0,0,0,0.015)' : undefined,
                        cursor: cell.current ? 'pointer' : 'default',
                      }}
                    >
                      <span style={{
                        display: 'block', fontSize: 48, fontWeight: 900, lineHeight: 0.9,
                        color: isToday ? 'var(--accent)' : !cell.current ? 'var(--border)' : 'var(--text)',
                        letterSpacing: '-0.03em', marginBottom: 6,
                      }}>
                        {cell.day}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {cellEvents.map(ev => {
                          const { bg, color: c } = eventColor(ev.type)
                          return (
                            <span
                              key={ev.id}
                              onClick={e => { e.stopPropagation(); openEdit(ev) }}
                              style={{ fontSize: 10, fontWeight: 500, color: c, background: bg, padding: '1px 5px', borderRadius: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', cursor: 'pointer' }}
                            >
                              {ev.title}
                            </span>
                          )
                        })}
                        {cellFamilyEvents.map(fe => (
                          <span
                            key={fe.id}
                            style={{ fontSize: 10, fontWeight: 500, color: '#4A3500', background: 'var(--accent3)', padding: '1px 5px', borderRadius: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}
                          >
                            {fe.name}
                          </span>
                        ))}
                        {cellPrograms.map(pr => (
                          <span
                            key={pr.id}
                            style={{ fontSize: 10, fontWeight: 500, color: '#3A2000', background: '#F5C842', padding: '1px 5px', borderRadius: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', fontStyle: 'italic' }}
                          >
                            {pr.name}
                          </span>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: 'var(--muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 1, display: 'inline-block' }} /> Event
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'var(--accent3)', borderRadius: 1, display: 'inline-block' }} /> Family Event
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: '#F5C842', borderRadius: 1, display: 'inline-block' }} /> Program (recurring)
        </span>
      </div>

      {/* Afterschool Programs */}
      <div>
        <SectionHeader title="Afterschool Programs" sub="Enrolled & waitlist programs appear on the calendar" onAdd={addProgram} addLabel="+ Add Program" />
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Program</th>
              <th>Day / Time</th>
              <th>Location</th>
              <th>Cost</th>
              <th>Status</th>
              <th style={{ width: 28 }}></th>
            </tr></thead>
            <tbody>
              {programs.map(pr => (
                <tr key={pr.id}>
                  <td><strong><EditCell value={pr.name} onSave={v => updateProgram(pr.id, 'name', v)} /></strong></td>
                  <td><EditCell value={pr.day_time} onSave={v => updateProgram(pr.id, 'day_time', v)} /></td>
                  <td><EditCell value={pr.location} onSave={v => updateProgram(pr.id, 'location', v)} /></td>
                  <td><EditCell value={pr.cost} onSave={v => updateProgram(pr.id, 'cost', v)} /></td>
                  <td><CycleBadge value={pr.status} options={PROGRAM_STATUSES} colorMap={PROGRAM_STATUS_CLASS} onCycle={v => updateProgram(pr.id, 'status', v)} /></td>
                  <td>
                    <button onClick={() => deleteProgram(pr.id)} style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }} title="Delete">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Family Events */}
      <div>
        <SectionHeader title="Family Events" sub="Events with family or class — appear on the calendar by date" onAdd={addFamilyEvent} addLabel="+ Add Event" />
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Date</th>
              <th>Event</th>
              <th>Who</th>
              <th>Notes</th>
              <th style={{ width: 28 }}></th>
            </tr></thead>
            <tbody>
              {familyEvents.map(fe => (
                <tr key={fe.id}>
                  <td><EditCell value={fe.date} onSave={v => updateFamilyEvent(fe.id, 'date', v)} /></td>
                  <td><strong><EditCell value={fe.name} onSave={v => updateFamilyEvent(fe.id, 'name', v)} /></strong></td>
                  <td><EditCell value={fe.who} onSave={v => updateFamilyEvent(fe.id, 'who', v)} /></td>
                  <td><EditCell value={fe.notes} onSave={v => updateFamilyEvent(fe.id, 'notes', v)} /></td>
                  <td>
                    <button onClick={() => deleteFamilyEvent(fe.id)} style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }} title="Delete">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Event Modal */}
      {modal?.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={() => setModal(null)}>
          <div className="card" style={{ padding: '24px 28px', width: 380, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>
              {modal.event ? 'Edit Event' : 'Add Event'} — {modal.date}
            </div>

            <div style={{ marginBottom: 12 }}>
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Event title"
                onKeyDown={e => e.key === 'Enter' && saveEvent()}
                style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[{ v: 'default', l: 'Green' }, { v: 'red', l: 'Red' }, { v: 'gold', l: 'Gold' }].map(opt => (
                <button key={opt.v} onClick={() => setForm(f => ({ ...f, type: opt.v }))}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600,
                    border: '1px solid', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit',
                    borderColor: form.type === opt.v ? 'var(--accent)' : 'var(--border)',
                    background: form.type === opt.v ? 'rgba(42,122,75,0.06)' : 'none',
                    color: form.type === opt.v ? 'var(--accent)' : 'var(--mid)',
                  }}
                >{opt.l}</button>
              ))}
            </div>

            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)"
              rows={2}
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none', resize: 'none', marginBottom: 16 }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEvent}
                style={{ flex: 1, padding: '8px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >{modal.event ? 'Save' : 'Add'}</button>
              {modal.event && (
                <button onClick={() => deleteEvent(modal.event!.id)}
                  style={{ padding: '8px 16px', background: 'none', color: 'var(--accent2)', border: '1px solid var(--accent2)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Delete</button>
              )}
              <button onClick={() => setModal(null)}
                style={{ padding: '8px 16px', background: 'none', color: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
