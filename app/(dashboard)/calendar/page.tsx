'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CalendarEvent { id: string; date: string; title: string; type: string; notes?: string }
interface AfterschoolProgram { id: string; name: string; day_time?: string; location?: string; cost?: string; status: string }
interface FamilyEvent { id: string; date: string; name: string; who?: string; notes?: string }
interface SchoolHoliday { id: string; name: string; start_date: string; end_date: string }
interface Sitter { id: string; name: string; color: string; contact?: string; rate_per_hour?: number; notes?: string }
interface SitterBooking {
  id: string; sitter_id: string; date: string; start_time?: string; end_time?: string
  total?: number; status: string; sitters?: { name: string; color: string }
}
interface DailyTransport { id: string; date: string; am_person?: string; pm_person?: string }

const SITTER_COLORS = ['#E57373', '#F06292', '#BA68C8', '#64B5F6', '#4DB6AC', '#81C784', '#FFB74D', '#A1887F']
const PROGRAM_STATUSES = ['consider', 'waitlist', 'enrolled']
const PROGRAM_STATUS_CLASS: Record<string, string> = { enrolled: 'badge-green', waitlist: 'badge-gold', consider: 'badge-gray' }
const BOOKING_STATUSES = ['tentative', 'confirmed', 'completed', 'cancelled']
const BOOKING_STATUS_CLASS: Record<string, string> = { confirmed: 'badge-green', tentative: 'badge-gold', completed: 'badge-gray', cancelled: 'badge-red' }

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
  return (
    <button onClick={() => { const i = options.indexOf(v); onCycle(options[(i + 1) % options.length]) }}
      className={`badge ${colorMap[v] || 'badge-gray'}`}
      style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }} title="Click to cycle">
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
      onKeyDown={e => e.key === 'Enter' && (onSave(v), setEditing(false))} />
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
  const [holidays, setHolidays] = useState<SchoolHoliday[]>([])
  const [sitters, setSitters] = useState<Sitter[]>([])
  const [sitterBookings, setSitterBookings] = useState<SitterBooking[]>([])
  const [transport, setTransport] = useState<DailyTransport[]>([])
  const [carpoolMatrix, setCarpoolMatrix] = useState<Record<string, Record<string, string>>>({})
  const [modal, setModal] = useState<{ open: boolean; date: string; event?: CalendarEvent } | null>(null)
  const [form, setForm] = useState({ date: '', title: '', type: 'default', notes: '' })
  const [bookingModal, setBookingModal] = useState<{ open: boolean; booking?: SitterBooking } | null>(null)
  const [bookingForm, setBookingForm] = useState({ sitter_id: '', date: '', start_time: '', end_time: '', status: 'tentative', total: '' })
  const supabase = createClient()
  const today = new Date()

  useEffect(() => { loadAll() }, [year, month])

  async function loadAll() {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
    const [evRes, prRes, feRes, holRes, sitRes, bkRes, trRes, cmRes] = await Promise.all([
      supabase.from('calendar_events').select('*').gte('date', start).lte('date', end),
      supabase.from('afterschool_programs').select('*').order('name'),
      supabase.from('family_events').select('*').order('date'),
      supabase.from('school_holidays').select('*').order('start_date'),
      supabase.from('sitters').select('*').order('name'),
      supabase.from('sitter_bookings').select('*, sitters(name, color)').order('date'),
      supabase.from('daily_transport').select('*').gte('date', start).lte('date', end),
      supabase.from('app_settings').select('value').eq('key', 'carpool_matrix').single(),
    ])
    if (evRes.data) setEvents(evRes.data)
    if (prRes.data) setPrograms(prRes.data)
    if (feRes.data) setFamilyEvents(feRes.data)
    if (holRes.data) setHolidays(holRes.data)
    if (sitRes.data) setSitters(sitRes.data)
    if (bkRes.data) setSitterBookings(bkRes.data)
    if (trRes.data) setTransport(trRes.data)
    if (cmRes.data?.value) { try { setCarpoolMatrix(JSON.parse(cmRes.data.value)) } catch {} }
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

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
    setModal(null); loadAll()
  }

  async function addProgram() { await supabase.from('afterschool_programs').insert({ name: 'New Program', status: 'consider' }); loadAll() }
  async function updateProgram(id: string, field: string, value: string) { await supabase.from('afterschool_programs').update({ [field]: value }).eq('id', id); loadAll() }
  async function deleteProgram(id: string) { await supabase.from('afterschool_programs').delete().eq('id', id); loadAll() }

  async function addFamilyEvent() { await supabase.from('family_events').insert({ date: new Date().toISOString().split('T')[0], name: 'New Event' }); loadAll() }
  async function updateFamilyEvent(id: string, field: string, value: string) { await supabase.from('family_events').update({ [field]: value }).eq('id', id); loadAll() }
  async function deleteFamilyEvent(id: string) { await supabase.from('family_events').delete().eq('id', id); loadAll() }

  async function addHoliday() {
    const d = new Date().toISOString().split('T')[0]
    await supabase.from('school_holidays').insert({ name: 'Holiday', start_date: d, end_date: d }); loadAll()
  }
  async function updateHoliday(id: string, field: string, value: string) { await supabase.from('school_holidays').update({ [field]: value }).eq('id', id); loadAll() }
  async function deleteHoliday(id: string) { await supabase.from('school_holidays').delete().eq('id', id); loadAll() }

  function openAddBooking() {
    setBookingForm({ sitter_id: sitters[0]?.id || '', date: new Date().toISOString().split('T')[0], start_time: '', end_time: '', status: 'tentative', total: '' })
    setBookingModal({ open: true })
  }
  function openEditBooking(b: SitterBooking) {
    setBookingForm({ sitter_id: b.sitter_id, date: b.date, start_time: b.start_time || '', end_time: b.end_time || '', status: b.status, total: b.total ? String(b.total) : '' })
    setBookingModal({ open: true, booking: b })
  }
  async function saveBooking() {
    if (!bookingForm.sitter_id || !bookingForm.date) return
    const data = { sitter_id: bookingForm.sitter_id, date: bookingForm.date, start_time: bookingForm.start_time || null, end_time: bookingForm.end_time || null, status: bookingForm.status, total: bookingForm.total ? parseFloat(bookingForm.total) : null }
    if (bookingModal?.booking) {
      await supabase.from('sitter_bookings').update(data).eq('id', bookingModal.booking.id)
    } else {
      await supabase.from('sitter_bookings').insert(data)
    }
    setBookingModal(null); loadAll()
  }
  async function deleteBooking(id: string) { await supabase.from('sitter_bookings').delete().eq('id', id); setBookingModal(null); loadAll() }

  async function setTransportField(date: string, field: 'am_person' | 'pm_person', value: string) {
    await supabase.from('daily_transport').upsert({ date, [field]: value || null }, { onConflict: 'date' })
    loadAll()
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const cells: Array<{ day: number; current: boolean; dateStr: string; dow: number }> = []
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i; const m = month === 0 ? 12 : month; const y = month === 0 ? year - 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, current: false, dateStr, dow: new Date(dateStr + 'T12:00:00').getDay() })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, current: true, dateStr, dow: new Date(dateStr + 'T12:00:00').getDay() })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 1 : month + 2; const y = month === 11 ? year + 1 : year
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
  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const DOW_DAY: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' }
  const activePrograms = programs.filter(pr => pr.status === 'enrolled' || pr.status === 'waitlist')
  const todayStr = todayDateStr()
  const upcomingBookings = sitterBookings.filter(b => b.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date))

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
        <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
          style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '5px 12px', borderRadius: 2 }}>
          Today
        </button>
      </div>

      {/* Grid */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--white)' }}>
          <thead>
            <tr>
              {DAYS.map(d => (
                <th key={d} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', padding: '10px 10px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--bg)', textAlign: 'left' }}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, row) => (
              <tr key={row}>
                {cells.slice(row * 7, row * 7 + 7).map((cell, col) => {
                  const isToday = cell.current && cell.dateStr === todayStr
                  const cellEvents = events.filter(ev => ev.date === cell.dateStr)
                  const cellFamilyEvents = familyEvents.filter(fe => fe.date === cell.dateStr)
                  const cellPrograms = cell.current ? activePrograms.filter(pr => parseProgramDays(pr.day_time).includes(cell.dow)) : []
                  const cellHolidays = holidays.filter(h => h.start_date <= cell.dateStr && cell.dateStr <= h.end_date)
                  const isHoliday = cellHolidays.length > 0
                  const cellSitters = sitterBookings.filter(b => b.date === cell.dateStr)
                  const cellTransport = transport.find(t => t.date === cell.dateStr)
                  const isWeekday = cell.dow >= 1 && cell.dow <= 5
                  const carpoolDay = DOW_DAY[cell.dow]
                  const amValue = cellTransport?.am_person || (carpoolDay ? carpoolMatrix[carpoolDay]?.AM : '') || ''
                  const pmValue = cellTransport?.pm_person || (carpoolDay ? carpoolMatrix[carpoolDay]?.PM : '') || ''

                  return (
                    <td
                      key={col}
                      onClick={() => cell.current && openAdd(cell.dateStr)}
                      style={{
                        width: 'calc(100%/7)', minHeight: 110, verticalAlign: 'top',
                        padding: '8px 8px 6px',
                        borderRight: col < 6 ? '1px solid var(--border)' : 'none',
                        borderBottom: row < 5 ? '1px solid var(--border)' : 'none',
                        background: !cell.current ? 'rgba(0,0,0,0.015)' : isHoliday ? 'rgba(155,144,135,0.07)' : undefined,
                        cursor: cell.current ? 'pointer' : 'default',
                      }}
                    >
                      <span style={{
                        display: 'block', fontSize: 40, fontWeight: 900, lineHeight: 0.9,
                        color: isToday ? 'var(--accent)' : !cell.current ? 'var(--border)' : isHoliday ? 'var(--muted)' : 'var(--text)',
                        letterSpacing: '-0.03em', marginBottom: 5,
                      }}>
                        {cell.day}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {cellHolidays.map(h => (
                          <span key={h.id} style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)', background: 'rgba(155,144,135,0.18)', padding: '1px 4px', borderRadius: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            {h.name}
                          </span>
                        ))}
                        {cellEvents.map(ev => {
                          const { bg, color: c } = eventColor(ev.type)
                          return (
                            <span key={ev.id} onClick={e => { e.stopPropagation(); openEdit(ev) }}
                              style={{ fontSize: 10, fontWeight: 500, color: c, background: bg, padding: '1px 5px', borderRadius: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', cursor: 'pointer' }}>
                              {ev.title}
                            </span>
                          )
                        })}
                        {cellFamilyEvents.map(fe => (
                          <span key={fe.id} style={{ fontSize: 10, fontWeight: 500, color: '#4A3500', background: 'var(--accent3)', padding: '1px 5px', borderRadius: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                            {fe.name}
                          </span>
                        ))}
                        {cellPrograms.map(pr => (
                          <span key={pr.id} style={{ fontSize: 10, fontWeight: 500, color: '#3A2000', background: '#F5C842', padding: '1px 5px', borderRadius: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', fontStyle: 'italic' }}>
                            {pr.name}
                          </span>
                        ))}
                        {cellSitters.map(b => {
                          const color = (b.sitters as any)?.color || '#81C784'
                          const name = (b.sitters as any)?.name || '?'
                          return (
                            <span key={b.id} onClick={e => { e.stopPropagation(); openEditBooking(b) }}
                              style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: color, padding: '1px 5px', borderRadius: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', cursor: 'pointer' }}>
                              {name}{b.start_time ? ` ${b.start_time}` : ''}
                            </span>
                          )
                        })}
                      </div>
                      {/* Transport row — weekdays only */}
                      {cell.current && isWeekday && (
                        <div onClick={e => e.stopPropagation()} style={{ marginTop: 5, borderTop: '1px dashed rgba(0,0,0,0.07)', paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--muted)' }}>
                            <span style={{ color: '#2A7A4B', fontWeight: 700 }}>↑</span>
                            <EditCell value={amValue} onSave={v => setTransportField(cell.dateStr, 'am_person', v)} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--muted)' }}>
                            <span style={{ color: '#C8311A', fontWeight: 700 }}>↓</span>
                            <EditCell value={pmValue} onSave={v => setTransportField(cell.dateStr, 'pm_person', v)} />
                          </div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 1, display: 'inline-block' }} /> Event</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'var(--accent3)', borderRadius: 1, display: 'inline-block' }} /> Family</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#F5C842', borderRadius: 1, display: 'inline-block' }} /> Program</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'rgba(155,144,135,0.3)', border: '1px solid var(--border)', borderRadius: 1, display: 'inline-block' }} /> No School</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#E57373', borderRadius: 1, display: 'inline-block' }} /> Sitter</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: '#2A7A4B', fontWeight: 700, fontSize: 10 }}>↑</span> Drop-off &nbsp;<span style={{ color: '#C8311A', fontWeight: 700, fontSize: 10 }}>↓</span> Pick-up</span>
      </div>

      {/* Afterschool Programs */}
      <div>
        <SectionHeader title="Afterschool Programs" sub="Enrolled & waitlist programs appear on the calendar" onAdd={addProgram} addLabel="+ Add Program" />
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Program</th><th>Day / Time</th><th>Location</th><th>Cost</th><th>Status</th><th style={{ width: 28 }}></th>
            </tr></thead>
            <tbody>
              {programs.map(pr => (
                <tr key={pr.id}>
                  <td><strong><EditCell value={pr.name} onSave={v => updateProgram(pr.id, 'name', v)} /></strong></td>
                  <td><EditCell value={pr.day_time} onSave={v => updateProgram(pr.id, 'day_time', v)} /></td>
                  <td><EditCell value={pr.location} onSave={v => updateProgram(pr.id, 'location', v)} /></td>
                  <td><EditCell value={pr.cost} onSave={v => updateProgram(pr.id, 'cost', v)} /></td>
                  <td><CycleBadge value={pr.status} options={PROGRAM_STATUSES} colorMap={PROGRAM_STATUS_CLASS} onCycle={v => updateProgram(pr.id, 'status', v)} /></td>
                  <td><button onClick={() => deleteProgram(pr.id)} style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Family Events */}
      <div>
        <SectionHeader title="Family Events" sub="Appear on the calendar by date" onAdd={addFamilyEvent} addLabel="+ Add Event" />
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Date</th><th>Event</th><th>Who</th><th>Notes</th><th style={{ width: 28 }}></th>
            </tr></thead>
            <tbody>
              {familyEvents.map(fe => (
                <tr key={fe.id}>
                  <td><EditCell value={fe.date} onSave={v => updateFamilyEvent(fe.id, 'date', v)} /></td>
                  <td><strong><EditCell value={fe.name} onSave={v => updateFamilyEvent(fe.id, 'name', v)} /></strong></td>
                  <td><EditCell value={fe.who} onSave={v => updateFamilyEvent(fe.id, 'who', v)} /></td>
                  <td><EditCell value={fe.notes} onSave={v => updateFamilyEvent(fe.id, 'notes', v)} /></td>
                  <td><button onClick={() => deleteFamilyEvent(fe.id)} style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* School Holidays */}
      <div>
        <SectionHeader title="School Holidays" sub="Days shown greyed out on the calendar" onAdd={addHoliday} addLabel="+ Add Holiday" />
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th>Holiday / Break</th><th>Start Date</th><th>End Date</th><th style={{ width: 28 }}></th>
            </tr></thead>
            <tbody>
              {holidays.length === 0 && (
                <tr><td colSpan={4} style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '16px 12px' }}>No holidays added yet</td></tr>
              )}
              {holidays.map(h => (
                <tr key={h.id}>
                  <td><strong><EditCell value={h.name} onSave={v => updateHoliday(h.id, 'name', v)} /></strong></td>
                  <td><EditCell value={h.start_date} onSave={v => updateHoliday(h.id, 'start_date', v)} /></td>
                  <td><EditCell value={h.end_date} onSave={v => updateHoliday(h.id, 'end_date', v)} /></td>
                  <td><button onClick={() => deleteHoliday(h.id)} style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit' }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Sitters */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div className="section-label">Upcoming Sitters</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Bookings appear on the calendar with sitter color</div>
          </div>
          <button onClick={openAddBooking} style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '5px 12px', cursor: 'pointer', borderRadius: 2 }}>
            + Book Sitter
          </button>
        </div>
        <div className="card">
            <table className="hl-table">
              <thead><tr>
                <th>Date</th><th>Sitter</th><th>Time</th><th>Total</th><th>Status</th><th style={{ width: 40 }}></th>
              </tr></thead>
              <tbody>
                {upcomingBookings.length === 0 && (
                  <tr><td colSpan={6} style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '16px 12px' }}>No upcoming bookings</td></tr>
                )}
                {upcomingBookings.map(b => {
                  const sitter = sitters.find(s => s.id === b.sitter_id)
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(b.date)}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: sitter?.color || '#81C784', flexShrink: 0, display: 'inline-block' }} />
                          {sitter?.name || '—'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--mid)', fontSize: 12 }}>
                        {b.start_time || ''}{b.start_time && b.end_time ? ' – ' : ''}{b.end_time || ''}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{b.total ? `$${b.total}` : '—'}</td>
                      <td>
                        <CycleBadge value={b.status} options={BOOKING_STATUSES} colorMap={BOOKING_STATUS_CLASS}
                          onCycle={async v => { await supabase.from('sitter_bookings').update({ status: v }).eq('id', b.id); loadAll() }} />
                      </td>
                      <td>
                        <button onClick={() => openEditBooking(b)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'inherit', fontWeight: 600 }}>edit</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {modal?.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={() => setModal(null)}>
          <div className="card" style={{ padding: '24px 28px', width: 380, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>
              {modal.event ? 'Edit Event' : 'Add Event'} — {modal.date}
            </div>
            <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Event title" onKeyDown={e => e.key === 'Enter' && saveEvent()}
              style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none', marginBottom: 12 }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[{ v: 'default', l: 'Green' }, { v: 'red', l: 'Red' }, { v: 'gold', l: 'Gold' }].map(opt => (
                <button key={opt.v} onClick={() => setForm(f => ({ ...f, type: opt.v }))}
                  style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, border: '1px solid', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit', borderColor: form.type === opt.v ? 'var(--accent)' : 'var(--border)', background: form.type === opt.v ? 'rgba(42,122,75,0.06)' : 'none', color: form.type === opt.v ? 'var(--accent)' : 'var(--mid)' }}>
                  {opt.l}
                </button>
              ))}
            </div>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)" rows={2}
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none', resize: 'none', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEvent} style={{ flex: 1, padding: '8px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {modal.event ? 'Save' : 'Add'}
              </button>
              {modal.event && (
                <button onClick={() => deleteEvent(modal.event!.id)} style={{ padding: '8px 16px', background: 'none', color: 'var(--accent2)', border: '1px solid var(--accent2)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
              )}
              <button onClick={() => setModal(null)} style={{ padding: '8px 16px', background: 'none', color: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Book Sitter Modal */}
      {bookingModal?.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={() => setBookingModal(null)}>
          <div className="card" style={{ padding: '24px 28px', width: 360, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>
              {bookingModal.booking ? 'Edit Booking' : 'Book Sitter'}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Sitter</label>
              <select value={bookingForm.sitter_id} onChange={e => setBookingForm(f => ({ ...f, sitter_id: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }}>
                <option value="">— select sitter —</option>
                {sitters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Date</label>
              <input type="date" value={bookingForm.date} onChange={e => setBookingForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Start Time</label>
                <input type="time" value={bookingForm.start_time} onChange={e => setBookingForm(f => ({ ...f, start_time: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>End Time</label>
                <input type="time" value={bookingForm.end_time} onChange={e => setBookingForm(f => ({ ...f, end_time: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['tentative', 'confirmed'].map(st => (
                <button key={st} onClick={() => setBookingForm(f => ({ ...f, status: st }))}
                  style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, border: '1px solid', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit', textTransform: 'capitalize', borderColor: bookingForm.status === st ? 'var(--accent)' : 'var(--border)', background: bookingForm.status === st ? 'rgba(42,122,75,0.06)' : 'none', color: bookingForm.status === st ? 'var(--accent)' : 'var(--mid)' }}>
                  {st}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Total ($)</label>
              <input type="number" value={bookingForm.total} onChange={e => setBookingForm(f => ({ ...f, total: e.target.value }))}
                placeholder="0.00"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveBooking} style={{ flex: 1, padding: '8px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {bookingModal.booking ? 'Save' : 'Book'}
              </button>
              {bookingModal.booking && (
                <button onClick={() => deleteBooking(bookingModal.booking!.id)} style={{ padding: '8px 16px', background: 'none', color: 'var(--accent2)', border: '1px solid var(--accent2)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
              )}
              <button onClick={() => setBookingModal(null)} style={{ padding: '8px 16px', background: 'none', color: 'var(--mid)', border: '1px solid var(--border)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
