import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import './OmdaAttributeTable.css'

const displayValue = value => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)

export default function OmdaAttributeTable({ item, mapRef, onClose }) {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading')
  const [selected, setSelected] = useState(null)
  const highlight = useRef(null)

  useEffect(() => {
    let cancelled = false
    const map = mapRef.current
    async function load() {
      try {
        const vector = await map.loadProjectLayer(item)
        if (cancelled) return
        if (!vector) { setState('error'); return }
        setRows(vector.getLayers().map(layer => layer.feature).filter(Boolean))
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    }
    load()
    return () => {
      cancelled = true
      highlight.current?.remove()
      highlight.current = null
    }
  }, [item, mapRef])

  function selectFeature(feature, index) {
    const map = mapRef.current
    if (!map) return
    highlight.current?.remove()
    const overlay = L.geoJSON(feature, {
      interactive: false,
      style: { color: '#111827', weight: 4, fillColor: '#facc15', fillOpacity: 0.5, dashArray: '6 4' },
      pointToLayer: (_, latlng) => L.circleMarker(latlng, { radius: 8, color: '#111827', fillColor: '#facc15', fillOpacity: 1 }),
    }).addTo(map)
    overlay.bringToFront()
    highlight.current = overlay
    setSelected(index)
    if (overlay.getBounds().isValid()) map.fitBounds(overlay.getBounds(), { padding: [40, 40], maxZoom: 18 })
  }

  function clearSelection() {
    highlight.current?.remove()
    highlight.current = null
    setSelected(null)
  }

  const columns = [...new Set(rows.flatMap(feature => Object.keys(feature.properties || {})))]
  return <section className="omda-table-panel" aria-label={`${item.name} attribute table`}>
    <header className="omda-table-header">
      <div><h2>{item.name} <span>Attributes</span></h2><p>{state === 'ready' ? `${rows.length} features · Select a row to highlight it on the map` : state === 'loading' ? 'Loading attributes…' : 'Could not load this layer. Close and reopen to retry.'}</p></div>
      <div className="omda-table-actions"><button onClick={clearSelection} disabled={selected === null}>Clear selection</button><button onClick={onClose} aria-label="Close attribute table" title="Close attribute table">×</button></div>
    </header>
    <div className="omda-table-scroll" tabIndex={0} aria-label="Scrollable attributes">
      {state === 'ready' && <table>
        <thead><tr><th scope="col">Feature</th>{columns.map(column => <th scope="col" key={column}>{column.replaceAll('_', ' ')}</th>)}</tr></thead>
        <tbody>{rows.map((feature, index) => <tr key={index} className={selected === index ? 'is-selected' : ''} onClick={() => selectFeature(feature, index)}>
          <td><button aria-label={`Highlight feature ${index + 1}`} aria-pressed={selected === index}>{index + 1}</button></td>
          {columns.map(column => <td key={column}>{displayValue(feature.properties?.[column])}</td>)}
        </tr>)}</tbody>
      </table>}
      {state === 'ready' && !rows.length && <p className="omda-table-empty">This layer has no features.</p>}
    </div>
  </section>
}
