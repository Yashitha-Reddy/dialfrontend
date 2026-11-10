import OmdaAttributeTable from './OmdaAttributeTable'
import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MeasurementControl from './MeasurementControl'
import catalog from './layer-manifest.json'
import './Login.css'
import OmdaReview, { LayerInfoButton } from './OmdaReview'
import { acres, excludedFeatureId, landLegend, landRows, landStyles, leaseRows } from './omdaReviewData'

const colors = { Boundaries: '#b4528e', OMDA_Lands: '#7c3aed', Airside: '#ca9429', Buildings: '#6576be', Cityside: '#6f9b59', Drainage_Sewer: '#3093ab', Other_Data: '#9a7654', Transportation: '#d17b45', Water_Bodies: '#368ed1' }
const groups = Object.keys(colors)
const omdaSummary = { id: 'omda-summary', name: 'OMDA Lands', summary: true, items: catalog.filter(item => item.group === 'OMDA_Lands') }
const layerColors = { ...Object.fromEntries([...catalog].filter(item => !item.color).sort((a, b) => a.id.localeCompare(b.id)).map((item, index) => [item.id, `hsl(${(index * 137.508) % 360} 68% ${36 + (index % 3) * 7}%)`])), ...Object.fromEntries(catalog.filter(item => item.color).map(item => [item.id, item.color])) }
const excludedLayer = catalog.find(item => item.id === 'Excluded_Premises')
const reviewLayers = new Map([
  ...omdaSummary.items.map(item => [item.id, item]),
  ...['aai-retained', 'dial-additional'].map(id => [id, { ...excludedLayer, id, name: landLegend[id], filter: feature => excludedFeatureId(feature) === id }]),
])
const initial = ['Total_IGIA_Land', 'IGI_DIAL_Property_Boundary', 'Demised_Premises', 'Carved_Out_Assets', 'aai-retained', 'dial-additional', 'AerocityAssets_NTA']

function styleReviewLayers(vectors, highlighted = []) {
  for (const id of initial) {
    const vector = vectors.get(id)
    if (!vector) continue
    const style = landStyles[id]
    if (!highlighted.length) vector.resetStyle()
    else if (highlighted.includes(id)) {
      vector.setStyle({ ...style, opacity: 1, weight: style.weight + 2, fillOpacity: style.fillOpacity ? style.fillOpacity + 0.14 : 0 })
    } else {
      vector.setStyle({ ...style, opacity: 0.58, fillOpacity: style.fillOpacity * 0.55 })
    }
    vector.bringToFront()
  }
  highlighted.forEach(id => {
    if (landStyles[id].fillOpacity) vectors.get(id)?.bringToFront()
  })
}
const reviewRows = [...landRows, ...leaseRows]
const legendRows = Object.entries(landLegend).map(([id, name]) => ({
  id, name, row: reviewRows.find(row => row.layers.length === 1 && row.layers[0] === id),
}))
const home = [28.556, 77.093]
const label = value => value.replaceAll('_', ' ')
const basemaps = { street: 'OpenStreetMap', satellite: 'Esri Satellite', terrain: 'OpenTopoMap' }

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
      row.insertCell().textContent = key === 'Area_Ac' ? 'GIS attribute (acres)' : label(key)
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
  const enabledRef = useRef(new Set(initial))
  const reviewVisibility = useRef(enabledRef.current)
  const projectBounds = useRef(null)
  const [enabled, setEnabled] = useState(new Set(initial))
  const [loadState, setLoadState] = useState({})
  const [selected, setSelected] = useState('street')
  const [orthoVisible, setOrthoVisible] = useState(false)
  const [orthoStatus, setOrthoStatus] = useState('')
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [advanced, setAdvanced] = useState(false)
  const [view, setView] = useState('compare')
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
          const color = landStyles[item.id]?.color || layerColors[item.id]
          const vector = L.geoJSON(data, {
            filter: item.filter,
            style: feature => {
              const landStyle = landStyles[item.id === excludedLayer.id ? excludedFeatureId(feature) : item.id]
              return landStyle || { color, weight: 1.5, fillOpacity: 0.16, dashArray: item.group === 'Boundaries' ? '7 5' : undefined }
            },
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
    Promise.all(initial.map(id => loadLayer(reviewLayers.get(id)))).then(vectors => {
      if (disposed) return
      const bounds = L.latLngBounds([])
      vectors.forEach(vector => { if (vector?.getBounds().isValid()) bounds.extend(vector.getBounds()) })
      if (bounds.isValid()) { projectBounds.current = bounds; if (!navigationRequest.current && !map.hasLayer(ortho)) map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 }) }
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
    if (!advanced) {
      const highlighted = focusedRow?.layers.filter(id => enabled.has(id))
      styleReviewLayers(cache.current, highlighted)
    }
  }, [advanced, enabled, focusedRow, loadState])

  function showLayerInfo(row) {
    setInfoRow(row)
    infoDialog.current.showModal()
  }

  function showLand(row) {
    setFocus(row?.id ?? null)
    mapRef.current.closePopup()
  }

  function toggleReviewLayer(id) {
    setVisibility(reviewLayers.get(id), !enabledRef.current.has(id))
    reviewVisibility.current = enabledRef.current
    if (focusedRow && !focusedRow.layers.some(layer => enabledRef.current.has(layer))) showLand(null)
  }

  function toggleAdvanced() {
    if (advanced) {
      navigationRequest.current += 1
      const next = reviewVisibility.current
      enabledRef.current = next
      setEnabled(next)
      setTableItem(null)
      mapRef.current.closePopup()
      cache.current.forEach((vector, id) => { if (!next.has(id)) vector.remove() })
      for (const id of next) {
        const vector = cache.current.get(id)
        if (vector) vector.addTo(mapRef.current)
        else mapRef.current.loadProjectLayer(reviewLayers.get(id))
      }
    } else {
      styleReviewLayers(cache.current)
      const split = ['aai-retained', 'dial-additional'].filter(id => enabledRef.current.has(id))
      if (split.length) {
        split.forEach(id => setVisibility(reviewLayers.get(id), false))
        setVisibility(excludedLayer, true)
      }
    }
    setAdvanced(!advanced)
    setSidebarOpen(true)
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
    cache.current.forEach(vector => vector.remove())
    enabledRef.current = new Set()
    setEnabled(new Set())
  }
  const filtered = catalog.filter(item => `${item.name} ${label(item.group)}`.toLowerCase().includes(query.toLowerCase()))
  const missingReviewLayer = !advanced && legendRows.some(({ id }) => enabled.has(id) && loadState[id] === 'error')
  const loading = Object.values(loadState).filter(state => state === 'loading').length

  return <div className="workspace">
    <header className="app-header"><a className="brand review-brand" href="/"><img className="review-brand-logo" src="/gmr.png" alt="GMR" width="64" height="24" /><span>IGI Airport Land Review</span></a><div className="review-header-actions"><button className="review-mode-button" onClick={toggleAdvanced}>{advanced ? 'Land review' : 'Advanced layers'}</button><button className="mobile-toggle" aria-label={sidebarOpen ? 'Hide side panel' : 'Show side panel'} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}><Glyph type="menu"/></button><button className="sign-out-button" onClick={onSignOut}>Logout</button></div></header>
    <div className="workspace-body">
      <aside className={`sidebar ${advanced ? '' : 'review-sidebar'} ${sidebarOpen ? 'is-open' : ''}`} aria-label={advanced ? 'Asset layers' : 'Land review panel'}>
        {advanced && <div className="advanced-layer-panel">
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
                <label><input type="checkbox" checked={enabled.has(item.id)} onChange={event => setVisibility(item, event.target.checked)}/><span className="layer-symbol" style={{ background: item.id === excludedLayer.id
                  ? `linear-gradient(90deg, ${landStyles['aai-retained'].color} 50%, ${landStyles['dial-additional'].color} 50%)`
                  : landStyles[item.id]?.color || layerColors[item.id] }}/><span className="layer-name">{item.name}<small>{loadState[item.id] === 'loading' ? 'Loading…' : loadState[item.id] === 'error' ? 'Failed to load. Toggle to retry.' : `${item.count.toLocaleString()} features`}</small></span></label>
                {item.group === 'OMDA_Lands' && enabled.has(item.id) && <button className="attribute-table-button" aria-label={`Open attribute table for ${item.name}`} title="Open attribute table" aria-pressed={tableItem?.id === item.id} onClick={() => setTableItem(item)}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 10v10M15 10v10"/></svg></button>}
                <button className="zoom-layer" aria-label={`Zoom to ${item.name}`} title="Zoom to layer" onClick={() => zoomToLayer(item)}><Glyph type="target"/></button>
              </div>)}</div>
            </details>
          })}
          {!filtered.length && <p className="empty-state">No layers match “{query}”.</p>}
        </div>
        <div className="sidebar-footer"><button className="project-extent" onClick={fitProject}><Glyph type="target"/>Zoom to project</button><span>Click a map feature to view its attributes.</span></div>
        </div>}
        <div className="guided-review-panel" hidden={advanced}>
          <OmdaReview view={view} setView={setView} focusedRow={focusedRow} showLand={showLand} enabled={enabled} onInfo={showLayerInfo}/>
        </div>
      </aside>
      <main className="map-panel" aria-label="Interactive airport map"><div ref={mapEl} className="map"/>
        {advanced ? <div className="visible-layer-count" role="status"><Glyph type="eye"/><span>{enabled.size} {enabled.size === 1 ? 'layer' : 'layers'} visible</span></div> :
          <details className="review-map-legend" open>
            <summary>OMDA land categories</summary>
            <div className="review-legend-items" role="region" aria-label="Map legend">
              {legendRows.map(({ id, name, row }) => {
                const visible = enabled.has(id)
                const selected = visible && focusedRow?.layers.includes(id)
                const style = landStyles[id]
                return <div className="review-legend-row" key={id}>
                  <button type="button" className="review-legend-name" disabled={!visible} aria-pressed={Boolean(selected)}
                    style={{ color: style.color }} onClick={() => showLand(focus === row.id ? null : row)}>
                    <i aria-hidden="true" style={{ borderTopStyle: style.dashArray ? 'dashed' : 'solid' }} />{name}
                  </button>
                  <LayerInfoButton row={row} name={name} onInfo={showLayerInfo}/>
                  <button type="button" className="review-legend-eye" aria-label={`Show ${name}`} aria-pressed={visible}
                    title={visible ? `Hide ${name}` : `Show ${name}`} onClick={() => toggleReviewLayer(id)}>
                    <Glyph type={visible ? 'eye' : 'eyeOff'} />
                  </button>
                </div>
              })}
              {missingReviewLayer && <small role="status">Some layers could not load. Turn them off and on to retry.</small>}
            </div>
          </details>}
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

    <footer className="status-bar"><span className="map-status" role="status"><span className="status-dot"/>{loading ? `Loading ${loading} vector layer${loading === 1 ? '' : 's'}…` : orthoVisible && position.zoom >= 10 ? orthoStatus : status}</span><span className="developer-credit">Developed by Geokno India Private Limited</span><span className="coordinates">{Math.abs(position.lat).toFixed(4)}° {position.lat >= 0 ? 'N' : 'S'}<span className="footer-divider"/>{Math.abs(position.lng).toFixed(4)}° {position.lng >= 0 ? 'E' : 'W'}</span><span className="zoom-label">Zoom <strong>{position.zoom}</strong></span></footer>
  </div>
}
