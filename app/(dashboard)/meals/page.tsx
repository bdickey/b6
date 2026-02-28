'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MealPlan {
  id: string
  week_of: string
  day: string
  dinner?: string
  time?: string
  who_cooks?: string
  is_special: boolean
}

interface CoreDish {
  id: string
  name: string
  time_mins?: number
  dish_type: string
}

interface GroceryItem {
  id: string
  name: string
  category: string
  checked: boolean
}

interface Restaurant {
  id: string
  name: string
  cuisine?: string
  address?: string
  phone?: string
  delivery_platform?: string
  delivery_url?: string
}

interface PlaceSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
}

interface DayEvent {
  title: string
  type: 'calendar' | 'family' | 'program'
  timeHint?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''

function getWeekOf(offset = 0) {
  const d = new Date()
  const sun = new Date(d)
  sun.setDate(d.getDate() - d.getDay() + offset * 7)
  return sun.toISOString().split('T')[0]
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

// Google Places Autocomplete component
function RestaurantSearch({ onSelect }: { onSelect: (r: Partial<Restaurant>) => void }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleInput(val: string) {
    setQuery(val)
    if (timer.current) clearTimeout(timer.current)
    if (!val.trim()) { setSuggestions([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY },
          body: JSON.stringify({ input: val, includedPrimaryTypes: ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'] }),
        })
        const data = await res.json()
        const suggs: PlaceSuggestion[] = (data.suggestions || []).map((s: any) => ({
          placeId: s.placePrediction?.placeId || '',
          mainText: s.placePrediction?.structuredFormat?.mainText?.text || s.placePrediction?.text?.text || '',
          secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text || '',
        })).filter((s: PlaceSuggestion) => s.placeId)
        setSuggestions(suggs)
        setOpen(suggs.length > 0)
      } catch {}
      setLoading(false)
    }, 300)
  }

  async function selectPlace(sugg: PlaceSuggestion) {
    setOpen(false)
    setQuery(sugg.mainText)
    setSuggestions([])
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${sugg.placeId}?fields=id,displayName,formattedAddress,nationalPhoneNumber,types`,
        { headers: { 'X-Goog-Api-Key': GOOGLE_KEY } }
      )
      const place = await res.json()
      const cuisine = place.types?.find((t: string) => ['restaurant', 'cafe', 'bakery', 'bar', 'meal_takeaway'].includes(t)) || ''
      onSelect({
        name: place.displayName?.text || sugg.mainText,
        address: place.formattedAddress || sugg.secondaryText,
        phone: place.nationalPhoneNumber || '',
        cuisine: cuisine.replace(/_/g, ' '),
      })
    } catch {
      onSelect({ name: sugg.mainText, address: sugg.secondaryText })
    }
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => handleInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
        placeholder="Search restaurant name…"
        style={{
          width: '100%', padding: '7px 10px', fontSize: 13,
          border: '1px solid var(--accent)', borderRadius: 2,
          background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
        }}
      />
      {loading && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--muted)' }}>…</span>}
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--white)', border: '1px solid var(--border)', borderTop: 'none',
          borderRadius: '0 0 3px 3px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {suggestions.map(s => (
            <div key={s.placeId}
              onMouseDown={e => { e.preventDefault(); selectPlace(s) }}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,122,75,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.mainText}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{s.secondaryText}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MealsPage() {
  const [weekOf, setWeekOf] = useState(getWeekOf(0))
  const [meals, setMeals] = useState<MealPlan[]>([])
  const [dishes, setDishes] = useState<CoreDish[]>([])
  const [groceries, setGroceries] = useState<GroceryItem[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [dayEvents, setDayEvents] = useState<Record<string, DayEvent[]>>({})
  const [subTab, setSubTab] = useState<'dishes' | 'grocery' | 'restaurants'>('dishes')
  const [copied, setCopied] = useState(false)
  const [addingRestaurant, setAddingRestaurant] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadMeals() }, [weekOf])
  useEffect(() => { loadStatic() }, [])

  async function loadMeals() {
    const weekDate = new Date(weekOf + 'T12:00:00')
    const dates = DAYS.map((_, i) => {
      const d = new Date(weekDate)
      d.setDate(weekDate.getDate() + i)
      return d.toISOString().split('T')[0]
    })

    const [mealsRes, calRes, feRes, prRes] = await Promise.all([
      supabase.from('meals_plan').select('*').eq('week_of', weekOf),
      supabase.from('calendar_events').select('*').gte('date', dates[0]).lte('date', dates[6]),
      supabase.from('family_events').select('*').gte('date', dates[0]).lte('date', dates[6]),
      supabase.from('afterschool_programs').select('*').in('status', ['enrolled', 'waitlist']),
    ])

    if (mealsRes.data) setMeals(mealsRes.data)

    const map: Record<string, DayEvent[]> = {}
    DAYS.forEach((day, i) => {
      const date = dates[i]
      const evs: DayEvent[] = []
      if (calRes.data) calRes.data.filter(e => e.date === date).forEach(e => evs.push({ title: e.title, type: 'calendar' }))
      if (feRes.data) feRes.data.filter(e => e.date === date).forEach(e => evs.push({ title: e.name, type: 'family' }))
      if (prRes.data) {
        const dow = new Date(date + 'T12:00:00').getDay()
        prRes.data.filter(p => parseProgramDays(p.day_time).includes(dow)).forEach(p => {
          const time = p.day_time ? p.day_time.replace(/^[a-z]+s?\s/i, '') : ''
          evs.push({ title: p.name, type: 'program', timeHint: time })
        })
      }
      map[day] = evs
    })
    setDayEvents(map)
  }

  async function loadStatic() {
    const [d, g, r] = await Promise.all([
      supabase.from('core_dishes').select('*').order('name'),
      supabase.from('grocery_items').select('*').order('category'),
      supabase.from('restaurants').select('*').order('name'),
    ])
    if (d.data) setDishes(d.data)
    if (g.data) setGroceries(g.data)
    if (r.data) setRestaurants(r.data)
  }

  function mealForDay(day: string) { return meals.find(m => m.day === day) }

  async function updateMeal(day: string, field: string, value: string | boolean) {
    const existing = mealForDay(day)
    if (existing) {
      await supabase.from('meals_plan').update({ [field]: value }).eq('id', existing.id)
    } else {
      await supabase.from('meals_plan').insert({ week_of: weekOf, day, [field]: value })
    }
    loadMeals()
  }

  async function clearMeal(day: string) {
    const existing = mealForDay(day)
    if (existing) { await supabase.from('meals_plan').delete().eq('id', existing.id); loadMeals() }
  }

  async function updateDish(id: string, field: string, value: string) {
    await supabase.from('core_dishes').update({ [field]: value }).eq('id', id)
    loadStatic()
  }

  async function deleteDish(id: string) {
    await supabase.from('core_dishes').delete().eq('id', id); loadStatic()
  }

  async function addRestaurantFromSearch(data: Partial<Restaurant>) {
    await supabase.from('restaurants').insert({
      name: data.name || 'New Restaurant',
      cuisine: data.cuisine || null,
      address: data.address || null,
      phone: data.phone || null,
    })
    setAddingRestaurant(false)
    loadStatic()
  }

  async function updateRestaurant(id: string, field: string, value: string) {
    await supabase.from('restaurants').update({ [field]: value }).eq('id', id); loadStatic()
  }

  async function deleteRestaurant(id: string) {
    await supabase.from('restaurants').delete().eq('id', id); loadStatic()
  }

  function EditCell({ value, onSave, style }: { value?: string; onSave: (v: string) => void; style?: React.CSSProperties }) {
    const [editing, setEditing] = useState(false)
    const [v, setV] = useState(value || '')
    if (editing) return (
      <input className="inline-input" autoFocus value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { onSave(v); setEditing(false) }}
        onKeyDown={e => e.key === 'Enter' && (onSave(v), setEditing(false))}
        style={style}
      />
    )
    return <span onClick={() => setEditing(true)} style={{ cursor: 'text', minWidth: 40, display: 'inline-block', ...style }}>{value || <span style={{ color: 'var(--border)' }}>—</span>}</span>
  }

  function weekLabel() {
    return new Date(weekOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const categories = ['produce', 'protein', 'pantry', 'dairy', 'bread']

  async function toggleGrocery(id: string, checked: boolean) {
    await supabase.from('grocery_items').update({ checked: !checked }).eq('id', id); loadStatic()
  }

  function copyGroceryList() {
    const lines = categories.flatMap(cat => {
      const items = groceries.filter(g => g.category === cat && !g.checked)
      if (!items.length) return []
      return [`${cat.toUpperCase()}:`, ...items.map(i => `  • ${i.name}`), '']
    })
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function addGroceryItem(category: string) {
    await supabase.from('grocery_items').insert({ name: 'New item', category, checked: false }); loadStatic()
  }

  async function addDish(type: string) {
    await supabase.from('core_dishes').insert({ name: 'New dish', dish_type: type, time_mins: 30 }); loadStatic()
  }

  const eventDotColor: Record<string, string> = {
    calendar: 'var(--accent)', family: 'var(--accent3)', program: '#F5C842',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

      {/* Left: Weekly Planner */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="section-label">Week of {weekLabel()}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setWeekOf(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] })}
              style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '3px 10px', borderRadius: 2 }}>‹ Prev</button>
            <button onClick={() => setWeekOf(getWeekOf(0))}
              style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '3px 10px', borderRadius: 2 }}>This Week</button>
            <button onClick={() => setWeekOf(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0] })}
              style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '3px 10px', borderRadius: 2 }}>Next ›</button>
          </div>
        </div>
        <div className="card">
          <table className="hl-table">
            <thead><tr>
              <th style={{ width: 50 }}>Day</th>
              <th>Dinner</th>
              <th style={{ width: 70 }}>Time</th>
              <th style={{ width: 90 }}>Who Cooks</th>
              <th style={{ width: 20 }}></th>
            </tr></thead>
            <tbody>
              {DAYS.map(day => {
                const meal = mealForDay(day)
                const isSpecial = day === 'Fri'
                const evs = dayEvents[day] || []
                return (
                  <tr key={day} style={isSpecial ? { background: 'rgba(232,160,32,0.05)' } : undefined}>
                    <td>
                      <span style={{ fontWeight: 700, color: isSpecial ? 'var(--accent3)' : 'var(--text)' }}>{day}</span>
                      {isSpecial && <div style={{ fontSize: 9, color: 'var(--accent3)', fontWeight: 600, letterSpacing: '0.08em' }}>SPECIAL</div>}
                    </td>
                    <td>
                      <EditCell value={meal?.dinner} onSave={v => updateMeal(day, 'dinner', v)} />
                      {evs.length > 0 && (
                        <div style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {evs.map((ev, i) => (
                            <span key={i} style={{ fontSize: 9, color: eventDotColor[ev.type], fontWeight: 600, opacity: 0.9 }}>
                              {ev.timeHint ? `${ev.title} (${ev.timeHint})` : ev.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td><EditCell value={meal?.time} onSave={v => updateMeal(day, 'time', v)} /></td>
                    <td><EditCell value={meal?.who_cooks} onSave={v => updateMeal(day, 'who_cooks', v)} /></td>
                    <td>
                      {meal && (
                        <button onClick={() => clearMeal(day)} title="Clear" style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0 }}>×</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--muted)', display: 'flex', gap: 12 }}>
          <span style={{ color: 'var(--accent)' }}>● events</span>
          <span style={{ color: 'var(--accent3)' }}>● family</span>
          <span style={{ color: '#F5C842' }}>● programs</span>
        </div>
      </div>

      {/* Right: Sub-tabs */}
      <div>
        <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
          {(['dishes', 'grocery', 'restaurants'] as const).map(tab => (
            <button key={tab} onClick={() => setSubTab(tab)}
              style={{
                fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '8px 16px', background: 'none', border: 'none',
                borderBottom: subTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                color: subTab === tab ? 'var(--accent)' : 'var(--mid)', cursor: 'pointer',
              }}
            >{tab === 'dishes' ? 'Core Dishes' : tab === 'grocery' ? 'Grocery List' : 'Restaurants'}</button>
          ))}
        </div>

        {subTab === 'dishes' && (
          <div>
            {(['benji', 'adult'] as const).map(type => (
              <div key={type} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="section-label">{type === 'benji' ? 'Benji Favorites' : 'Adult Favorites'}</div>
                  <button onClick={() => addDish(type)} style={{ fontFamily: 'inherit', fontSize: 10, color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '3px 8px', cursor: 'pointer', borderRadius: 2 }}>+ Add</button>
                </div>
                <div className="card">
                  <table className="hl-table">
                    <thead><tr><th>Dish</th><th style={{ width: 60 }}>Mins</th><th style={{ width: 24 }}></th></tr></thead>
                    <tbody>
                      {dishes.filter(d => d.dish_type === type).map(d => (
                        <tr key={d.id}>
                          <td><EditCell value={d.name} onSave={v => updateDish(d.id, 'name', v)} /></td>
                          <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                            <EditCell value={d.time_mins ? String(d.time_mins) : ''} onSave={v => updateDish(d.id, 'time_mins', v)} />
                          </td>
                          <td>
                            <button onClick={() => deleteDish(d.id)} style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {subTab === 'grocery' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button onClick={copyGroceryList}
                style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: copied ? 'var(--muted)' : 'var(--accent)', border: 'none', padding: '6px 14px', cursor: 'pointer', borderRadius: 2 }}>
                {copied ? '✓ Copied' : 'Copy List'}
              </button>
            </div>
            {categories.map(cat => {
              const items = groceries.filter(g => g.category === cat)
              return (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div className="section-label">{cat}</div>
                    <button onClick={() => addGroceryItem(cat)} style={{ fontFamily: 'inherit', fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
                  </div>
                  <div className="card">
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid var(--border)' }}>
                        <input type="checkbox" checked={item.checked} onChange={() => toggleGrocery(item.id, item.checked)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, color: item.checked ? 'var(--muted)' : 'var(--text)', textDecoration: item.checked ? 'line-through' : 'none', flex: 1 }}>{item.name}</span>
                      </div>
                    ))}
                    {items.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--muted)' }}>No items</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {subTab === 'restaurants' && (
          <div>
            {/* Add restaurant via Google Places */}
            <div style={{ marginBottom: 12 }}>
              {addingRestaurant ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <RestaurantSearch onSelect={addRestaurantFromSearch} />
                  <button onClick={() => setAddingRestaurant(false)}
                    style={{ fontFamily: 'inherit', fontSize: 11, color: 'var(--mid)', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '6px 10px', borderRadius: 2, whiteSpace: 'nowrap' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setAddingRestaurant(true)}
                    style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '5px 12px', cursor: 'pointer', borderRadius: 2 }}>
                    + Add Restaurant
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              <table className="hl-table">
                <thead><tr>
                  <th>Name</th>
                  <th>Cuisine</th>
                  <th>Address</th>
                  <th>Phone</th>
                  <th>Order</th>
                  <th style={{ width: 24 }}></th>
                </tr></thead>
                <tbody>
                  {restaurants.map(r => (
                    <tr key={r.id}>
                      <td><strong><EditCell value={r.name} onSave={v => updateRestaurant(r.id, 'name', v)} /></strong></td>
                      <td><EditCell value={r.cuisine} onSave={v => updateRestaurant(r.id, 'cuisine', v)} /></td>
                      <td style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 160 }}>
                        <EditCell value={r.address} onSave={v => updateRestaurant(r.id, 'address', v)} />
                      </td>
                      <td style={{ fontSize: 11 }}>
                        <EditCell value={r.phone} onSave={v => updateRestaurant(r.id, 'phone', v)} />
                      </td>
                      <td>
                        {r.delivery_url ? (
                          <a href={r.delivery_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                            {r.delivery_platform || 'Order'} →
                          </a>
                        ) : (
                          <EditCell value={r.delivery_platform} onSave={v => updateRestaurant(r.id, 'delivery_platform', v)} />
                        )}
                      </td>
                      <td>
                        <button onClick={() => deleteRestaurant(r.id)} style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 13, padding: 0 }}>×</button>
                      </td>
                    </tr>
                  ))}
                  {restaurants.length === 0 && (
                    <tr><td colSpan={6} style={{ color: 'var(--muted)', textAlign: 'center', padding: 16 }}>No restaurants yet — click + Add Restaurant to search</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
