'use client'

import { useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const CACHE_KEY = 'benji_place_coords_v2'

interface PlaceVisited {
  id: string
  name: string
  type: string
  year?: number
}

interface PlaceWithCoords extends PlaceVisited {
  coordinates: [number, number]
}

async function geocodePlace(name: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1&addressdetails=1`,
      { headers: { 'Accept-Language': 'en-US,en' } }
    )
    const data = await res.json()
    if (data[0]?.lon && data[0]?.lat) {
      return [parseFloat(data[0].lon), parseFloat(data[0].lat)]
    }
  } catch {}
  return null
}

const MARKER_COLORS: Record<string, string> = {
  home: '#6B7280',
  city: '#C8311A',
  beach: '#0891B2',
  nature: '#16A34A',
  intl: '#C8311A',
}

const LEGEND_ITEMS: [string, string][] = [
  ['US City', '#C8311A'],
  ['Beach', '#0891B2'],
  ['Nature', '#16A34A'],
  ['International', '#C8311A'],
]

export default function TravelMap({ places }: { places: PlaceVisited[] }) {
  const [placesWithCoords, setPlacesWithCoords] = useState<PlaceWithCoords[]>([])
  const [geocoding, setGeocoding] = useState(false)
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [10, 15],
    zoom: 1,
  })

  useEffect(() => {
    if (places.length === 0) { setPlacesWithCoords([]); return }

    const cached: Record<string, [number, number]> = JSON.parse(
      localStorage.getItem(CACHE_KEY) || '{}'
    )

    // Set already-cached places immediately
    const immediate: PlaceWithCoords[] = places
      .filter(p => cached[p.name])
      .map(p => ({ ...p, coordinates: cached[p.name] }))
    setPlacesWithCoords(immediate)

    const needGeocode = places.filter(p => !cached[p.name])
    if (needGeocode.length === 0) return

    setGeocoding(true)

    async function geocodeAll() {
      const newCache = { ...cached }
      for (const place of needGeocode) {
        const coords = await geocodePlace(place.name)
        if (coords) newCache[place.name] = coords
        // Nominatim rate limit: 1 req/sec
        await new Promise(r => setTimeout(r, 1100))
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache))
      const all: PlaceWithCoords[] = places
        .filter(p => newCache[p.name])
        .map(p => ({ ...p, coordinates: newCache[p.name] }))
      setPlacesWithCoords(all)
      setGeocoding(false)
    }

    geocodeAll()
  }, [places])

  return (
    <div
      style={{
        width: '100%',
        background: '#e4e6ea',
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'inherit',
        userSelect: 'none',
      }}
    >
      {/* Title overlay */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#1a1a2e',
            lineHeight: 1,
          }}
        >
          BENJI&apos;S TRAVEL MAP
        </div>
        <div
          style={{
            fontSize: 9,
            color: '#888',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {placesWithCoords.length} place{placesWithCoords.length !== 1 ? 's' : ''} visited
          {geocoding && ' · locating…'}
        </div>
      </div>

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          right: 14,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {(['+', '−', '⌂'] as const).map((label, i) => (
          <button
            key={label}
            onClick={() => {
              if (label === '⌂') {
                setPosition({ coordinates: [10, 15], zoom: 1 })
              } else {
                setPosition(p => ({
                  ...p,
                  zoom: Math.max(0.8, Math.min(10, p.zoom * (i === 0 ? 1.6 : 0.625))),
                }))
              }
            }}
            style={{
              width: 26,
              height: 26,
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 3,
              cursor: 'pointer',
              fontSize: label === '⌂' ? 12 : 16,
              fontWeight: 700,
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              fontFamily: 'inherit',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          zIndex: 10,
          background: 'rgba(255,255,255,0.88)',
          padding: '5px 9px',
          borderRadius: 3,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {LEGEND_ITEMS.filter((item, idx, arr) => arr.findIndex(a => a[0] === item[0]) === idx).map(([label, color]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
                border: '1.5px solid white',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: '#555',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {label}
            </span>
          </span>
        ))}
      </div>

      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 155, center: [0, 0] }}
        style={{ width: '100%', display: 'block' }}
        height={440}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={pos => setPosition(pos)}
        >
          {/* Ocean fill */}
          <rect x={-2000} y={-1000} width={4000} height={2000} fill="#e4e6ea" />

          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#f4f4f4"
                  stroke="#cecece"
                  strokeWidth={0.4}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#eeeeee', outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {placesWithCoords.map(place => {
            const color = MARKER_COLORS[place.type] || '#C8311A'
            return (
              <Marker key={place.id} coordinates={place.coordinates}>
                <g style={{ cursor: 'pointer' }}>
                  {/* Drop shadow */}
                  <circle cx={0.5} cy={1.5} r={5} fill="rgba(0,0,0,0.18)" />
                  {/* Outer ring */}
                  <circle r={5} fill={color} stroke="white" strokeWidth={1.5} />
                  {/* Center dot */}
                  <circle r={1.5} fill="white" />
                  {/* City name */}
                  <text
                    textAnchor="middle"
                    y={-8}
                    style={{
                      fontSize: 6.5,
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      fill: '#1a1a1a',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      paintOrder: 'stroke',
                      stroke: 'white',
                      strokeWidth: 2.5,
                      strokeLinejoin: 'round',
                    } as React.CSSProperties}
                  >
                    {place.name}
                  </text>
                </g>
              </Marker>
            )
          })}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  )
}
