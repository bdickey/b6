'use client'

import { useEffect, useState } from 'react'
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
  week_of?: string
}

interface Restaurant {
  id: string
  name: string
  cuisine?: string
  delivery_platform?: string
  delivery_url?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekOf(offset = 0) {
  const d = new Date()
  const day = d.getDay()
  const sun = new Date(d)
  sun.setDate(d.getDate() - day + offset * 7)
  return sun.toISOString().split('T')[0]
}

export default function MealsPage() {
  const [weekOf, setWeekOf] = useState(getWeekOf(0))
  const [meals, setMeals] = useState<MealPlan[]>([])
  const [dishes, setDishes] = useState<CoreDish[]>([])
  const [groceries, setGroceries] = useState<GroceryItem[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [subTab, setSubTab] = useState<'dishes' | 'grocery' | 'restaurants'>('dishes')
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadMeals() }, [weekOf])
  useEffect(() => { loadStatic() }, [])

  async function loadMeals() {
    const { data } = await supabase.from('meals_plan').select('*').eq('week_of', weekOf)
    if (data) setMeals(data)
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

  function mealForDay(day: string) {
    return meals.find(m => m.day === day)
  }

  async function updateMeal(day: string, field: string, value: string | boolean) {
    const existing = mealForDay(day)
    if (existing) {
      await supabase.from('meals_plan').update({ [field]: value }).eq('id', existing.id)
    } else {
      await supabase.from('meals_plan').insert({ week_of: weekOf, day, [field]: value })
    }
    loadMeals()
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
    const d = new Date(weekOf + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const categories = ['produce', 'protein', 'pantry', 'dairy', 'bread']

  async function toggleGrocery(id: string, checked: boolean) {
    await supabase.from('grocery_items').update({ checked: !checked }).eq('id', id)
    loadStatic()
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
    await supabase.from('grocery_items').insert({ name: 'New item', category, checked: false })
    loadStatic()
  }

  async function addDish(type: string) {
    await supabase.from('core_dishes').insert({ name: 'New dish', dish_type: type, time_mins: 30 })
    loadStatic()
  }

  async function addRestaurant() {
    await supabase.from('restaurants').insert({ name: 'New Restaurant' })
    loadStatic()
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
            </tr></thead>
            <tbody>
              {DAYS.map(day => {
                const meal = mealForDay(day)
                const isSpecial = day === 'Fri'
                return (
                  <tr key={day} style={isSpecial ? { background: 'rgba(232,160,32,0.05)' } : undefined}>
                    <td>
                      <span style={{ fontWeight: 700, color: isSpecial ? 'var(--accent3)' : 'var(--text)' }}>{day}</span>
                      {isSpecial && <div style={{ fontSize: 9, color: 'var(--accent3)', fontWeight: 600, letterSpacing: '0.08em' }}>SPECIAL</div>}
                    </td>
                    <td><EditCell value={meal?.dinner} onSave={v => updateMeal(day, 'dinner', v)} /></td>
                    <td><EditCell value={meal?.time} onSave={v => updateMeal(day, 'time', v)} /></td>
                    <td><EditCell value={meal?.who_cooks} onSave={v => updateMeal(day, 'who_cooks', v)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
                    <thead><tr><th>Dish</th><th>Time</th></tr></thead>
                    <tbody>
                      {dishes.filter(d => d.dish_type === type).map(d => (
                        <tr key={d.id}>
                          <td>{d.name}</td>
                          <td style={{ color: 'var(--muted)', fontSize: 11 }}>{d.time_mins ? `${d.time_mins}m` : '—'}</td>
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
                        <span style={{ fontSize: 13, color: item.checked ? 'var(--muted)' : 'var(--text)', textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</span>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button onClick={addRestaurant} style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'none', border: '1px dashed var(--border)', padding: '5px 12px', cursor: 'pointer', borderRadius: 2 }}>+ Add Restaurant</button>
            </div>
            <div className="card">
              <table className="hl-table">
                <thead><tr><th>Name</th><th>Cuisine</th><th>Order</th></tr></thead>
                <tbody>
                  {restaurants.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong></td>
                      <td style={{ color: 'var(--muted)' }}>{r.cuisine || '—'}</td>
                      <td>
                        {r.delivery_url ? (
                          <a href={r.delivery_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                            {r.delivery_platform || 'Order'} →
                          </a>
                        ) : <span style={{ color: 'var(--border)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
