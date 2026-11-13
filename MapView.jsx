import OmdaAttributeTable from './OmdaAttributeTable'
import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MeasurementControl from './MeasurementControl'
import manifest from './layer-manifest.json'
import './Login.css'
import OmdaReview, { LayerInfoButton } from './OmdaReview'
import { acres, excludedFeatureId, landRows, landStyles, leaseRows } from './omdaReviewData'

const colors = { Boundaries: '#b4528e', OMDA_Lands: '#7c3aed', Airside: '#ca9429', Buildings: '#6576be', Cityside: '#6f9b59', Drainage_Sewer: '#3093ab', Other_Data: '#9a7654', Transportation: '#d17b45', Water_Bodies: '#368ed1' }
const groups = Object.keys(colors)
const excludedLayer = manifest.find(item => item.id === 'Excluded_Premises')
// Excluded Premises holds two features with different meanings, so the panel lists them as two separate layers.
const excludedParts = [
  ['aai-retained', 'Excluded Premises (kept by AAI)'],
  ['dial-additional', 'Excluded Premises (leased to DIAL 2009)'],
].map(([id, name]) => ({ ...excludedLayer, id, name, count: 1, filter: feature => excludedFeatureId(feature) === id }))
const catalog = manifest.flatMap(item => item.id === excludedLayer.id ? excludedParts : [item])
const omdaSummary = { id: 'omda-summary', name: 'OMDA Lands', summary: true, items: catalog.filter(item => item.group === 'OMDA_Lands') }
const layerColors = { ...Object.fromEntries([...manifest].filter(item => !item.color).sort((a, b) => a.id.localeCompare(b.id)).map((item, index) => [item.id, `hsl(${(index * 137.508) % 360} 68% ${36 + (index % 3) * 7}%)`])), ...Object.fromEntries(manifest.filter(item => item.color).map(item => [item.id, item.color])) }
const omdaIds = omdaSummary.items.map(item => item.id)
const catalogId = id => id
const boundaryLayer = catalog.find(item => item.id === 'Total_IGIA_Land')
const omdaTabs = [['layers', 'Layers'], ['compare', 'Compare'], ['lease', 'Follow the lease']]

// Filled areas get a thin white outline and a light tint of their colour so the orthophoto stays readable.
// Outline-only boundaries keep their own colour so they can still be told apart.
// Fill opacity for filled areas; the map's Fill slider changes it at runtime.
let fillLevel = 0.3
function mapStyle(style, highlighted = false) {
  if (!style.fillOpacity) return highlighted ? { ...style, opacity: 1, weight: style.weight + 2 } : style
  return { color: '#ffffff', weight: highlighted ? 3 : 1.5, opacity: 1, fillColor: style.color, fillOpacity: highlighted ? Math.min(fillLevel + 0.2, 1) : fillLevel }
}
function isPolygon(feature) {
  return /Polygon/.test(feature?.geometry?.type || '')
}

function styleOmdaLayers(vectors, highlighted = []) {
  for (const id of omdaIds) {
    const vector = vectors.get(id)
    if (!vector) continue
    if (!highlighted.length) { vector.resetStyle(); continue }
    vector.setStyle(feature => {
      const key = id === excludedLayer.id ? excludedFeatureId(feature) : id
      const style = landStyles[key]
      if (!style) return {}
      return highlighted.includes(key)
        ? mapStyle(style, true)
        : { ...mapStyle(style), opacity: 0.55, fillOpacity: style.fillOpacity ? fillLevel * 0.5 : 0 }
    })
  }
  highlighted.forEach(key => { if (landStyles[key]?.fillOpacity) vectors.get(catalogId(key))?.bringToFront() })
}
const reviewRows = [...landRows, ...leaseRows]
const catalogItem = id => catalog.find(item => item.id === id)
const infoRowFor = id => reviewRows.find(row => row.layers.length === 1 && row.layers[0] === id)
const layerSwatch = item => landStyles[item.id]?.color || layerColors[item.id]
const TableIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 10v10M15 10v10"/></svg>
const home = [28.556, 77.093]
const label = value => value.replaceAll('_', ' ')
// MapTiler key comes from VITE_MAPTILER_KEY in .env. Without it the street basemap falls back to OpenStreetMap.
const maptilerKey = import.meta.env.VITE_MAPTILER_KEY
const basemaps = { street: maptilerKey ? 'MapTiler Streets' : 'OpenStreetMap', satellite: 'Esri Satellite', terrain: 'OpenTopoMap' }

function Glyph({ type }) {
  const paths = { eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0', eyeOff: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.4 6.4C3.6 8 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.2-1M10 5.2c.6-.1 1.3-.2 2-.2 6.5 0 10 7 10 7s-.8 1.6-2.3 3.2', layers: 'm12 3 10 6-10 6L2 9Zm-10 10 10 6 10-6M2 17l10 6 10-6', target: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', menu: 'M4 6h16M4 12h16M4 18h16' }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[type]} /></svg>
}

function featurePopup(feature, layer, name) {
  layer.bindPopup(() => {
    const container = document.createElement('div')
    container.className = 'feature-info'
    const title = document.createElement('h3')
    title.textContent = feature.properties?.Names || name
    container.append(title)
    const table = document.createElement('table')
    Object.entries(feature.properties || {}).forEach(([key, value]) => {
      if (value === null || value === '') return
      const row = table.insertRow()
      row.insertCell().textContent = key === 'Area_Ac' ? 'Geokno survey (acres)' : label(key)
      row.insertCell().textContent = key === 'Area_Ac' ? acres(Number(value)) : typeof value === 'object' ? JSON.stringify(value) : String(value)
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
  const enabledRef = useRef(new Set())
  const projectBounds = useRef(null)
  const [enabled, setEnabled] = useState(new Set())
  const [loadState, setLoadState] = useState({})
  const [selected, setSelected] = useState('street')
  const [orthoVisible, setOrthoVisible] = useState(true)
  const [orthoStatus, setOrthoStatus] = useState('')
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [omdaTab, setOmdaTab] = useState('layers')
  const [fill, setFill] = useState(fillLevel)
  const [focus, setFocus] = useState(null)
  const [infoRow, setInfoRow] = useState(null)
  const infoDialog = useRef(null)
  const focusedRow = reviewRows.find(row => row.id === focus)
  const navigationRequest = useRef(0)
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
      street: maptilerKey
        ? L.tileLayer(`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${maptilerKey}`, { tileSize: 512, zoomOffset: -1, minZoom: 1, maxZoom: 21, maxNativeZoom: 20, crossOrigin: true, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' })
        : L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 21, maxNativeZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 21, maxNativeZoom: 19, attribution: 'Tiles &copy; Esri — Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community' }),
      terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 21, maxNativeZoom: 17, attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' }),
    }
    const orthoPane = map.createPane('ortho')
    orthoPane.style.zIndex = '250'
    orthoPane.style.pointerEvents = 'none'
    const ortho = L.tileLayer('https://dialortho.s3.ap-south-1.amazonaws.com/tiles/{z}/{x}/{y}.png', {
      pane: 'ortho', opacity: 1, minZoom: 10, maxZoom: 21, maxNativeZoom: 19, noWrap: true, attribution: 'DIAL Orthophoto captured Oct 2026 by Geokno India Private Limited',
    })
    let missingTiles = false
    ortho.on('loading', () => { missingTiles = false; setOrthoStatus('Loading orthophoto…') })
    ortho.on('tileerror', () => { missingTiles = true })
    ortho.on('load', () => setOrthoStatus(missingTiles ? 'Basemap shown where orthophoto tiles are unavailable' : 'Orthophoto ready'))
    // Rangpuri ortho tiles sit in their own folder in the same bucket and switch on and off with the main ortho.
    const rangpuriOrtho = L.tileLayer('https://dialortho.s3.ap-south-1.amazonaws.com/tiles/Rangpuri/{z}/{x}/{y}.png', {
      pane: 'ortho', opacity: 1, minZoom: 10, maxZoom: 21, maxNativeZoom: 19, noWrap: true,
    })
    orthoRef.current = L.layerGroup([ortho, rangpuriOrtho])
    orthoRef.current.addTo(map)
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
          const color = landStyles[item.id]?.color || layerColors[item.id]
          const vector = L.geoJSON(data, {
            filter: item.filter,
            style: feature => {
              const landStyle = landStyles[item.id === excludedLayer.id ? excludedFeatureId(feature) : item.id]
              if (landStyle) return mapStyle(landStyle)
              if (item.group === 'Boundaries') return { color, weight: 2, fillOpacity: 0, dashArray: '7 5' }
              return isPolygon(feature) ? mapStyle({ color, weight: 1.5, fillOpacity: 1 }) : { color, weight: 1.5 }
            },
            pointToLayer: (_, latlng) => L.circleMarker(latlng, { radius: 3.5, color, fillColor: color, fillOpacity: 0.8, weight: 1 }),
            onEachFeature: (feature, layer) => featurePopup(feature, layer, item.name),
          })
          // Outline-only boundaries get a white halo underneath so the coloured line stands out on the orthophoto.
          const outlineOnly = item.group === 'Boundaries' || (landStyles[item.id] && !landStyles[item.id].fillOpacity)
          if (outlineOnly) {
            const lineWeight = landStyles[item.id]?.weight || 2
            const halo = L.geoJSON(data, { filter: item.filter, interactive: false, style: () => ({ color: '#ffffff', weight: lineWeight + 3, opacity: 0.95, fill: false }) })
            vector.on('add', () => { halo.addTo(map); vector.bringToFront() })
            vector.on('remove', () => halo.remove())
          }
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
    // Load the airport boundary only to know the project extent; it stays off the map until switched on.
    loadLayer(boundaryLayer).then(vector => {
      if (!disposed && vector?.getBounds().isValid()) projectBounds.current = vector.getBounds()
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

  useEffect(() => {
    fillLevel = fill
    cache.current.forEach((vector, id) => { if (!omdaIds.includes(id)) vector.resetStyle() })
    styleOmdaLayers(cache.current, focusedRow?.layers.filter(id => enabled.has(catalogId(id))))
  }, [enabled, focusedRow, loadState, fill])

  function showLayerInfo(row) {
    setInfoRow(row)
    infoDialog.current.showModal()
  }

  function showLand(row) {
    setFocus(row?.id ?? null)
    mapRef.current.closePopup()
    // Selecting a category switches its layers on so the highlight is visible.
    row?.layers.forEach(id => { if (!enabledRef.current.has(catalogId(id))) setVisibility(catalogItem(catalogId(id)), true) })
  }

  function isRowVisible(row) {
    return row.layers.every(id => enabledRef.current.has(catalogId(id)))
  }

  function toggleRow(row, visible) {
    new Set(row.layers.map(catalogId)).forEach(id => setVisibility(catalogItem(id), visible))
    if (!visible && focus === row.id) setFocus(null)
  }

  function changeOmdaTab(next) {
    setOmdaTab(next)
    showLand(null)
  }

  function setVisibility(item, visible) {
    navigationRequest.current += 1
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
    const map = mapRef.current
    const request = navigationRequest.current
    const vector = await map.loadProjectLayer(item)
    if (mapRef.current === map && request === navigationRequest.current && vector?.getBounds().isValid()) map.fitBounds(vector.getBounds(), { padding: [35, 35], maxZoom: 18 })
  }
  function fitProject() {
    navigationRequest.current += 1
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
    navigationRequest.current += 1
    setTableItem(null)
    setFocus(null)
    cache.current.forEach(vector => vector.remove())
    enabledRef.current = new Set()
    setEnabled(new Set())
  }
  const filtered = catalog.filter(item => `${item.name} ${label(item.group)}`.toLowerCase().includes(query.toLowerCase()))
  const loading = Object.values(loadState).filter(state => state === 'loading').length

  return <div className="workspace">
    <header className="app-header"><a className="brand review-brand" href="/"><img className="review-brand-logo" src="/gmr.png" alt="GMR" width="64" height="24" /><span>IGI Airport Land Review</span></a><div className="review-header-actions"><button className="mobile-toggle" aria-label={sidebarOpen ? 'Hide side panel' : 'Show side panel'} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}><Glyph type="menu"/></button><span className="fill-control"><span>Fill opacity</span><input type="range" min="0" max="1" step="0.05" value={fill} aria-label="Fill opacity of map areas" onChange={event => setFill(Number(event.target.value))}/><output>{Math.round(fill * 100)}%</output></span><button className="sign-out-button" onClick={onSignOut}>Logout</button></div></header>
    <div className="workspace-body">
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Asset layers">
        <div className="advanced-layer-panel">
        <div className="sidebar-heading"><h1>Asset Layers</h1></div>
        <div className="layer-search-row"><label className="layer-search"><Glyph type="search"/><input type="search" placeholder="Find a layer…" aria-label="Search asset layers" value={query} onChange={event => setQuery(event.target.value)}/></label><button type="button" className="project-extent-icon" onClick={fitProject} aria-label="Zoom to project" title="Zoom to project"><Glyph type="target"/></button><button type="button" className="project-extent-icon hide-all-button" onClick={hideAll} disabled={!enabled.size} aria-label="Hide all layers" title="Hide all layers"><Glyph type="eyeOff"/></button></div>
        <div className="layer-groups">
          {groups.map(group => {
            const sectionItems = catalog.filter(item => item.group === group)
            const selectedCount = sectionItems.filter(item => enabled.has(item.id)).length
            const items = filtered.filter(item => item.group === group)
            if (!items.length) return null
            const isOmda = group === 'OMDA_Lands'
            const tab = isOmda && !query ? omdaTab : 'layers'
            return <details className={`layer-group ${isOmda ? 'omda-group' : ''}`} key={group} open={query || isOmda ? true : undefined}>
              <summary><strong>{label(group)}</strong><span className="group-count">{selectedCount ? `${selectedCount} on · ` : ''}{items.length}</span></summary>
              {isOmda && !query && <div className="omda-tabs" role="tablist" aria-label="OMDA Lands views">
                {omdaTabs.map(([id, name]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => changeOmdaTab(id)}>{name}</button>)}
              </div>}
              {tab === 'layers' ? <>
                <div className="section-select-row">
                  <label className="section-select-all"><input type="checkbox" aria-label={`Select all ${label(group)} layers`} checked={selectedCount === sectionItems.length} ref={input => { if (input) input.indeterminate = selectedCount > 0 && selectedCount < sectionItems.length }} onChange={event => sectionItems.forEach(item => setVisibility(item, event.target.checked))}/><span>Select all</span><small>{selectedCount}/{sectionItems.length}</small></label>
                  {isOmda && <div className="layer-row-actions"><button className="attribute-table-button" aria-label="Open OMDA Lands summary table" title="Open OMDA Lands summary table" onClick={() => setTableItem(omdaSummary)}><TableIcon/></button><span className="icon-slot"/></div>}
                </div>
                <div className="layer-list">{items.map(item => <div className={`layer-row ${enabled.has(item.id) ? 'is-visible' : ''}`} key={item.id}>
                  <label><input type="checkbox" checked={enabled.has(item.id)} onChange={event => setVisibility(item, event.target.checked)}/><span className="layer-symbol" style={{ background: layerSwatch(item) }}/><span className="layer-name">{item.name}<small>{loadState[item.id] === 'loading' ? 'Loading…' : loadState[item.id] === 'error' ? 'Failed to load. Toggle to retry.' : `${item.count.toLocaleString()} features`}</small></span></label>
                  <div className="layer-row-actions">
                    {isOmda && (infoRowFor(item.id) ? <LayerInfoButton row={infoRowFor(item.id)} name={item.name} onInfo={showLayerInfo}/> : <span className="icon-slot"/>)}
                    {isOmda && (enabled.has(item.id)
                      ? <button className="attribute-table-button" aria-label={`Open attribute table for ${item.name}`} title="Open attribute table" aria-pressed={tableItem?.id === item.id} onClick={() => setTableItem(item)}><TableIcon/></button>
                      : <span className="icon-slot"/>)}
                    <button className="zoom-layer" aria-label={`Zoom to ${item.name}`} title="Zoom to layer" onClick={() => zoomToLayer(item)}><Glyph type="target"/></button>
                  </div>
                </div>)}</div>
              </> : <div className="omda-review-embedded">
                <OmdaReview view={tab} focusedRow={focusedRow} showLand={showLand} onInfo={showLayerInfo} isRowVisible={isRowVisible} toggleRow={toggleRow}/>
              </div>}
            </details>
          })}
          {!filtered.length && <p className="empty-state">No layers match “{query}”.</p>}
        </div>
        </div>
      </aside>
      <main className="map-panel" aria-label="Interactive airport map"><div ref={mapEl} className="map"/>
        <details className="map-legend" open>
          <summary><Glyph type="eye"/><span>{enabled.size} {enabled.size === 1 ? 'layer' : 'layers'} visible</span></summary>
          {enabled.size > 0 && <ul className="map-legend-list" aria-label="Visible layers">
            {catalog.filter(item => enabled.has(item.id)).map(item => <li key={item.id}>
              <span className="layer-symbol" style={{ background: layerSwatch(item) }}/>
              <span className="map-legend-name">{item.name}</span>
              <button type="button" className="map-legend-hide" onClick={() => setVisibility(item, false)} aria-label={`Hide ${item.name}`} title={`Hide ${item.name}`}><Glyph type="eyeOff"/></button>
            </li>)}
          </ul>}
        </details>
        <MeasurementControl mapRef={mapRef}/>
        
        <div className="basemap-select"><Glyph type="layers"/><span>Basemap</span><select aria-label="Choose basemap" value={selected} onChange={event => changeBasemap(event.target.value)}>{Object.entries(basemaps).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><button className="ortho-toggle" type="button" aria-pressed={orthoVisible} onClick={toggleOrtho}>Ortho photo</button></div>
        <div className="map-tools" aria-label="Map navigation"><button aria-label="Zoom in" onClick={() => mapRef.current.zoomIn()}><Glyph type="plus"/></button><button aria-label="Zoom out" onClick={() => mapRef.current.zoomOut()}><Glyph type="minus"/></button><div className="tool-divider"/><button aria-label="Zoom to project extent" onClick={fitProject}><Glyph type="target"/></button></div>
    {tableItem && (tableItem.summary || enabled.has(tableItem.id)) && <OmdaAttributeTable key={tableItem.id} item={tableItem} mapRef={mapRef} onClose={() => setTableItem(null)}/>}
      </main>
    </div>

    <dialog ref={infoDialog} className="review-info-dialog" aria-labelledby="review-info-title" onClose={() => setInfoRow(null)}>
      <form method="dialog">
        <button type="submit" aria-label="Close layer information">×</button>
      </form>
      {infoRow && <>
        <h2 id="review-info-title" style={{ color: landStyles[infoRow.layers[0]].color }}>{infoRow.label}</h2>
        <p>{infoRow.detail}</p>
        {infoRow.agreement != null && infoRow.gis != null && (
          <p className="review-difference">
            {acres(Math.abs(infoRow.gis - infoRow.agreement))} acres {infoRow.gis === infoRow.agreement ? 'difference' : infoRow.gis > infoRow.agreement ? 'above the 2006 agreement' : 'below the 2006 agreement'}
          </p>
        )}
      </>}
    </dialog>

    <footer className="status-bar"><span className="map-status" role="status">{loading ? <><span className="status-dot"/>{`Loading ${loading} vector layer${loading === 1 ? '' : 's'}…`}</> : null}</span><span className="developer-credit">Developed by Geokno India Private Limited</span><span className="coordinates">{Math.abs(position.lat).toFixed(4)}° {position.lat >= 0 ? 'N' : 'S'}<span className="footer-divider"/>{Math.abs(position.lng).toFixed(4)}° {position.lng >= 0 ? 'E' : 'W'}</span><span className="zoom-label">Zoom <strong>{position.zoom}</strong></span></footer>
  </div>
}
