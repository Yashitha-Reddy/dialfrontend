import OmdaAttributeTable from './OmdaAttributeTable'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MeasurementControl from './MeasurementControl'
import catalog from './layer-manifest.json'
import './Login.css'

const colors = { Boundaries: '#b4528e', OMDA_Lands: '#7c3aed', Airside: '#ca9429', Buildings: '#6576be', Cityside: '#6f9b59', Drainage_Sewer: '#3093ab', Other_Data: '#9a7654', Transportation: '#d17b45', Water_Bodies: '#368ed1' }
const groups = Object.keys(colors)
const omdaSummary = { id: 'omda-summary', name: 'OMDA Lands', summary: true, items: catalog.filter(item => item.group === 'OMDA_Lands') }
const layerColors = { ...Object.fromEntries([...catalog].filter(item => !item.color).sort((a, b) => a.id.localeCompare(b.id)).map((item, index) => [item.id, `hsl(${(index * 137.508) % 360} 68% ${36 + (index % 3) * 7}%)`])), ...Object.fromEntries(catalog.filter(item => item.color).map(item => [item.id, item.color])) }
const initial = catalog.filter(item => item.group === 'Boundaries').map(item => item.id)
const home = [28.556, 77.093]
const label = value => value.replaceAll('_', ' ')
const basemaps = { street: 'OpenStreetMap', satellite: 'Esri Satellite', terrain: 'OpenTopoMap' }

function Glyph({ type }) {
  const paths = { eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0', layers: 'm12 3 10 6-10 6L2 9Zm-10 10 10 6 10-6M2 17l10 6 10-6', map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15M15 6v15', target: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', menu: 'M4 6h16M4 12h16M4 18h16' }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[type]} /></svg>
}

function featurePopup(feature, layer, name) {
  layer.bindPopup(() => {
    const container = document.createElement('div')
    container.className = 'feature-info'
    const title = document.createElement('h3')
    title.textContent = name
    container.append(title)
    const table = document.createElement('table')
    Object.entries(feature.properties || {}).forEach(([key, value]) => {
      if (value === null || value === '') return
      const row = table.insertRow()
      row.insertCell().textContent = label(key)
      row.insertCell().textContent = typeof value === 'object' ? JSON.stringify(value) : String(value)
    })
    if (!table.rows.length) container.append('No attributes available.')
    else container.append(table)
    return container
  }, { maxWidth: 350 })
}

export default function MapView() {
  const [signedIn, setSignedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function signIn(event) {
    event.preventDefault()
    if (username === 'test_user' && password === '123456') {
      setPassword('')
      setError('')
      setSignedIn(true)
    } else {
      setError('Incorrect username or password.')
    }
  }

  if (signedIn) return <MapWorkspace onSignOut={() => {
    setSignedIn(false)
    setUsername('')
    setPassword('')
    setError('')
  }}/>

  return <main className="login-page">
    <form className="login-card" onSubmit={signIn}>
      <span className="login-brand">DIAL GIS</span>
      <h1>Sign in</h1>

      <label htmlFor="login-username">Username</label>
      <input id="login-username" name="username" autoComplete="username" required value={username} onChange={event => { setUsername(event.target.value); setError('') }}/>
      <label htmlFor="login-password">Password</label>
      <input id="login-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={event => { setPassword(event.target.value); setError('') }} aria-describedby={error ? 'login-error' : undefined}/>
      {error && <p id="login-error" className="login-error" role="alert">{error}</p>}
      <button className="login-submit" type="submit">Sign in</button>
    </form>
  </main>
}

function MapWorkspace({ onSignOut }) {
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const baseRef = useRef({})
  const orthoRef = useRef(null)
  const cache = useRef(new Map())
  const pending = useRef(new Map())
  const enabledRef = useRef(new Set(initial))
  const projectBounds = useRef(null)
  const [enabled, setEnabled] = useState(new Set(initial))
  const [loadState, setLoadState] = useState({})
  const [selected, setSelected] = useState('street')
  const [orthoVisible, setOrthoVisible] = useState(false)
  const [orthoStatus, setOrthoStatus] = useState('')
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [position, setPosition] = useState({ lat: home[0], lng: home[1], zoom: 13 })
  const [status, setStatus] = useState('Loading map…')
  const [tableItem, setTableItem] = useState(null)

  useEffect(() => {
    const map = L.map(mapEl.current, { center: home, zoom: 13, zoomControl: false, preferCanvas: true, maxZoom: 21 })
    mapRef.current = map
    const controller = new AbortController()
    let disposed = false
    const layerCache = cache.current
    const pendingLoads = pending.current
    const layers = {
      street: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 21, maxNativeZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 21, maxNativeZoom: 19, attribution: 'Tiles &copy; Esri — Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community' }),
      terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 21, maxNativeZoom: 17, attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' }),
    }
    const orthoPane = map.createPane('ortho')
    orthoPane.style.zIndex = '250'
    orthoPane.style.pointerEvents = 'none'
    const ortho = L.tileLayer('https://dialortho.s3.ap-south-1.amazonaws.com/tiles/{z}/{x}/{y}.png', {
      pane: 'ortho', opacity: 0.82, minZoom: 10, maxZoom: 21, maxNativeZoom: 19, noWrap: true, attribution: 'DIAL Orthophoto',
    })
    let missingTiles = false
    ortho.on('loading', () => { missingTiles = false; setOrthoStatus('Loading orthophoto…') })
    ortho.on('tileerror', () => { missingTiles = true })
    ortho.on('load', () => setOrthoStatus(missingTiles ? 'Basemap shown where orthophoto tiles are unavailable' : 'Orthophoto ready'))
    orthoRef.current = ortho
    Object.values(layers).forEach(layer => {
      layer.on('loading', () => setStatus('Loading basemap…'))
      layer.on('load', () => setStatus('Map ready'))
      layer.on('tileerror', () => setStatus('Some basemap tiles are unavailable'))
    })
    baseRef.current = layers
    layers.street.addTo(map)
    const updatePosition = () => { const center = map.getCenter(); setPosition({ lat: center.lat, lng: center.lng, zoom: map.getZoom() }) }
    map.on('moveend zoomend', updatePosition)
    L.control.scale({ imperial: false }).addTo(map)
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(mapEl.current)

    async function loadLayer(item) {
      if (cache.current.has(item.id)) return cache.current.get(item.id)
      if (pending.current.has(item.id)) return pending.current.get(item.id)
      setLoadState(current => ({ ...current, [item.id]: 'loading' }))
      const task = (async () => {
        try {
          const response = await fetch(item.url, { signal: controller.signal })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const data = await response.json()
          if (disposed) return null
          const color = layerColors[item.id]
          const vector = L.geoJSON(data, {
            style: { color, weight: item.group === 'Boundaries' ? 2.5 : item.group === 'OMDA_Lands' ? 2.2 : 1.5, fillOpacity: item.group === 'Boundaries' ? 0.035 : item.group === 'OMDA_Lands' ? 0.1 : 0.2, dashArray: item.group === 'Boundaries' ? '7 5' : undefined },
            pointToLayer: (_, latlng) => L.circleMarker(latlng, { radius: 3.5, color, fillColor: color, fillOpacity: 0.8, weight: 1 }),
            onEachFeature: (feature, layer) => featurePopup(feature, layer, item.name),
          })
          cache.current.set(item.id, vector)
          if (enabledRef.current.has(item.id)) vector.addTo(map)
          setLoadState(current => ({ ...current, [item.id]: 'ready' }))
          return vector
        } catch (error) {
          if (!disposed && error.name !== 'AbortError') {
            setLoadState(current => ({ ...current, [item.id]: 'error' }))
            return null
          }
          return null
        } finally { if (pending.current.get(item.id) === task) pending.current.delete(item.id) }
      })()
      pending.current.set(item.id, task)
      return task
    }
    map.loadProjectLayer = loadLayer
    Promise.all(catalog.filter(item => initial.includes(item.id)).map(loadLayer)).then(vectors => {
      if (disposed) return
      const bounds = L.latLngBounds([])
      vectors.forEach(vector => { if (vector?.getBounds().isValid()) bounds.extend(vector.getBounds()) })
      if (bounds.isValid()) { projectBounds.current = bounds; if (!map.hasLayer(ortho)) map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 }) }
    })
    return () => {
      disposed = true
      controller.abort()
      observer.disconnect()
      map.remove()
      mapRef.current = null
      layerCache.clear()
      pendingLoads.clear()
    }
  }, [])

  function setVisibility(item, visible) {
    const next = new Set(enabledRef.current)
    if (visible) next.add(item.id)
    else next.delete(item.id)
    enabledRef.current = next
    setEnabled(next)
    const vector = cache.current.get(item.id)
    if (!visible) {
      vector?.remove()
      setTableItem(current => current?.id === item.id ? null : current)
    }
    else if (vector) vector.addTo(mapRef.current)
    else mapRef.current.loadProjectLayer(item)
  }
  async function zoomToLayer(item) {
    setVisibility(item, true)
    const vector = await mapRef.current.loadProjectLayer(item)
    if (vector?.getBounds().isValid()) mapRef.current.fitBounds(vector.getBounds(), { padding: [35, 35], maxZoom: 18 })
  }
  function fitProject() {
    if (projectBounds.current?.isValid()) mapRef.current.fitBounds(projectBounds.current, { padding: [35, 35] })
    else mapRef.current.setView(home, 13)
  }
  function changeBasemap(id) {
    baseRef.current[selected].remove()
    const map = mapRef.current
    baseRef.current[id].addTo(map)
    setSelected(id)
  }
  function toggleOrtho() {
    const map = mapRef.current
    const ortho = orthoRef.current
    if (map.hasLayer(ortho)) {
      ortho.remove()
      setOrthoVisible(false)
    } else {
      ortho.addTo(map)
      setOrthoVisible(true)
    }
  }
  function hideAll() {
    setTableItem(null)
    cache.current.forEach(vector => vector.remove())
    enabledRef.current = new Set()
    setEnabled(new Set())
  }
  const filtered = catalog.filter(item => `${item.name} ${label(item.group)}`.toLowerCase().includes(query.toLowerCase()))
  const loading = Object.values(loadState).filter(state => state === 'loading').length

  return <div className="workspace">
    <header className="app-header"><a className="brand" href="/" aria-label="DIAL GIS home"><span className="brand-icon"><Glyph type="map" /></span><span>DIAL<span className="brand-light"> GIS</span></span></a><button className="mobile-toggle" aria-label="Toggle vector layer panel" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}><Glyph type="menu"/></button><button className="sign-out-button" onClick={onSignOut}>Logout</button></header>
    <div className="workspace-body">
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Asset layers">
        <div className="sidebar-heading"><h1>Asset Layers</h1></div>
        <label className="layer-search"><Glyph type="search"/><input type="search" placeholder="Find a layer…" aria-label="Search asset layers" value={query} onChange={event => setQuery(event.target.value)}/></label>
        <div className="layer-actions"><span>{catalog.length} layers</span><button onClick={hideAll} disabled={!enabled.size}>Hide all</button></div>
        <div className="layer-groups">
          {groups.map(group => {
            const sectionItems = catalog.filter(item => item.group === group)
            const selectedCount = sectionItems.filter(item => enabled.has(item.id)).length
            const items = filtered.filter(item => item.group === group)
            if (!items.length) return null
            return <details className="layer-group" key={group} open={query ? true : group === 'Boundaries' ? true : undefined}>
              <summary><strong>{label(group)}</strong><span>{items.length}</span></summary>
              <div className="section-select-row"><label className="section-select-all"><input type="checkbox" aria-label={`Select all ${label(group)} layers`} checked={selectedCount === sectionItems.length} ref={input => { if (input) input.indeterminate = selectedCount > 0 && selectedCount < sectionItems.length }} onChange={event => sectionItems.forEach(item => setVisibility(item, event.target.checked))}/><span>Select all</span><small>{selectedCount}/{sectionItems.length}</small></label>{group === 'OMDA_Lands' && <button className="attribute-table-button" aria-label="Open OMDA Lands summary table" title="Open OMDA Lands summary table" onClick={() => setTableItem(omdaSummary)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 10v10M15 10v10"/></svg></button>}</div>
              <div>{items.map(item => <div className={`layer-row ${enabled.has(item.id) ? 'is-visible' : ''}`} key={item.id}>
                <label><input type="checkbox" checked={enabled.has(item.id)} onChange={event => setVisibility(item, event.target.checked)}/><span className="layer-symbol" style={{ background: layerColors[item.id] }}/><span className="layer-name">{item.name}<small>{loadState[item.id] === 'loading' ? 'Loading…' : loadState[item.id] === 'error' ? 'Failed to load. Toggle to retry.' : `${item.count.toLocaleString()} features`}</small></span></label>
                {item.group === 'OMDA_Lands' && enabled.has(item.id) && <button className="attribute-table-button" aria-label={`Open attribute table for ${item.name}`} title="Open attribute table" aria-pressed={tableItem?.id === item.id} onClick={() => setTableItem(item)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 10v10M15 10v10"/></svg></button>}
                <button className="zoom-layer" aria-label={`Zoom to ${item.name}`} title="Zoom to layer" onClick={() => zoomToLayer(item)}><Glyph type="target"/></button>
              </div>)}</div>
            </details>
          })}
          {!filtered.length && <p className="empty-state">No layers match “{query}”.</p>}
        </div>
        <div className="sidebar-footer"><button className="project-extent" onClick={fitProject}><Glyph type="target"/>Zoom to project</button><span>Click a map feature to view its attributes.</span></div>
      </aside>
      <main className="map-panel" aria-label="Interactive airport map"><div ref={mapEl} className="map"/><div className="visible-layer-count" role="status"><Glyph type="eye"/><span>{enabled.size} {enabled.size === 1 ? 'layer' : 'layers'} visible</span></div>
        <MeasurementControl mapRef={mapRef}/>
        
        <div className="basemap-select"><Glyph type="layers"/><span>Basemap</span><select aria-label="Choose basemap" value={selected} onChange={event => changeBasemap(event.target.value)}>{Object.entries(basemaps).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><button className="ortho-toggle" type="button" aria-pressed={orthoVisible} onClick={toggleOrtho}>Ortho photo</button></div>
        <div className="map-tools" aria-label="Map navigation"><button aria-label="Zoom in" onClick={() => mapRef.current.zoomIn()}><Glyph type="plus"/></button><button aria-label="Zoom out" onClick={() => mapRef.current.zoomOut()}><Glyph type="minus"/></button><div className="tool-divider"/><button aria-label="Zoom to project extent" onClick={fitProject}><Glyph type="target"/></button></div>
    {tableItem && (tableItem.summary || enabled.has(tableItem.id)) && <OmdaAttributeTable key={tableItem.id} item={tableItem} mapRef={mapRef} onClose={() => setTableItem(null)}/>}
      </main>
    </div>

    <footer className="status-bar"><span className="map-status" role="status"><span className="status-dot"/>{loading ? `Loading ${loading} vector layer${loading === 1 ? '' : 's'}…` : orthoVisible && position.zoom >= 10 ? orthoStatus : status}</span><span className="developer-credit">Developed by Geokno India Private Limited</span><span className="coordinates">{Math.abs(position.lat).toFixed(4)}° {position.lat >= 0 ? 'N' : 'S'}<span className="footer-divider"/>{Math.abs(position.lng).toFixed(4)}° {position.lng >= 0 ? 'E' : 'W'}</span><span className="zoom-label">Zoom <strong>{position.zoom}</strong></span></footer>
  </div>
}






