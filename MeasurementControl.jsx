import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'

// Spherical area with wrapped longitude differences, in square metres.
function polygonArea(points) {
  if (points.length < 3) return 0
  const radians = Math.PI / 180
  let sum = 0
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length]
    const delta = ((next.lng - point.lng + 540) % 360) - 180
    sum += delta * radians * (2 + Math.sin(point.lat * radians) + Math.sin(next.lat * radians))
  })
  const sphere = 4 * Math.PI * 6371000 ** 2
  const area = Math.abs(sum * 6371000 ** 2 / 2) % sphere
  return Math.min(area, sphere - area)
}

function MeasureIcon({ type }) {
  const paths = {
    ruler: 'm3 17 14-14 4 4L7 21Zm4-4 2 2m1-5 2 2m1-5 2 2m1-5 2 2',
    line: 'M5 19 19 5M3 17h4v4H3ZM17 3h4v4h-4Z',
    polygon: 'm5 18 3-13 12 5-4 10ZM6 3h4v4H6ZM18 8h4v4h-4ZM3 16h4v4H3ZM14 18h4v4h-4Z',
    rectangle: 'M4 6h16v12H4ZM2 4h4v4H2ZM18 16h4v4h-4Z',
    circle: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 12h9M12 11v2',
    area: 'm4 7 8-4 8 4v10l-8 4-8-4Zm0 0 8 4 8-4M12 11v10M8 9v10M16 9v10',
    clear: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
    undo: 'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 6 6v3',
    finish: 'm5 12 4 4L19 6',
  }
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[type]}/></svg>
}

export default function MeasurementControl({ mapRef }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('line')
  const [points, setPoints] = useState([])
  const [finished, setFinished] = useState(false)
  const overlay = useRef(null)
  const drawing = open && !finished
  const twoPoint = mode === 'rectangle' || mode === 'circle'
  const minimum = mode === 'line' || twoPoint ? 2 : 3

  useEffect(() => {
    const map = mapRef.current
    if (!map || !drawing) return
    const container = map.getContainer()
    const doubleClickEnabled = map.doubleClickZoom.enabled()
    map.doubleClickZoom.disable()
    container.classList.add('is-measuring')
    map.closePopup()
    const click = event => setPoints(current => {
      const next = [...current, event.latlng]
      if (twoPoint && next.length === 2) setFinished(true)
      return next
    })
    const stopPopup = () => map.closePopup()
    const key = event => {
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'Enter' && (event.target === document.body || container.contains(event.target))) setPoints(current => {
        if (current.length >= minimum) setFinished(true)
        return current
      })
    }
    // Capture drawing points before a feature popup can consume the click.
    map.on('preclick', click)
    map.on('popupopen', stopPopup)
    document.addEventListener('keydown', key)
    return () => {
      map.off('preclick', click)
      map.off('popupopen', stopPopup)
      document.removeEventListener('keydown', key)
      container.classList.remove('is-measuring')
      if (doubleClickEnabled) map.doubleClickZoom.enable()
    }
  }, [mapRef, drawing, minimum, twoPoint])


  let distance = points.reduce((total, point, index) => total + (index ? points[index - 1].distanceTo(point) : 0), 0)
  if (mode !== 'line' && points.length >= 3) distance += points[points.length - 1].distanceTo(points[0])
  let area = polygonArea(points)
  if (points.length === 2 && mode === 'rectangle') {
    const [a, b] = points
    const corners = [a, L.latLng(a.lat, b.lng), b, L.latLng(b.lat, a.lng)]
    area = polygonArea(corners)
    distance = corners.reduce((total, point, index) => total + point.distanceTo(corners[(index + 1) % 4]), 0)
  }
  if (points.length === 2 && mode === 'circle') {
    const radius = points[0].distanceTo(points[1])
    area = 2 * Math.PI * 6371000 ** 2 * (1 - Math.cos(radius / 6371000))
    distance = 2 * Math.PI * 6371000 * Math.sin(radius / 6371000)
  }
  const number = value => value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  const lengthText = distance >= 1000 ? `${number(distance / 1000)} km` : `${number(distance)} m`
  const areaText = `${number(area / 4046.8564224)} acres`
  const resultText = mode === 'line' ? `Distance ${lengthText}` : `Area ${areaText} · Perimeter ${lengthText}`

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    overlay.current?.remove()
    const group = L.layerGroup().addTo(map)
    overlay.current = group
    if (open) {
      const style = { color: '#167561', weight: 3, fillOpacity: 0.18, interactive: false }
      if (points.length > 1) {
        if (mode === 'rectangle') L.rectangle(L.latLngBounds(points), style).addTo(group)
        else if (mode === 'circle') L.circle(points[0], { ...style, radius: points[0].distanceTo(points[1]) }).addTo(group)
        else if (mode !== 'line' && points.length >= 3) L.polygon(points, style).addTo(group)
        else L.polyline(points, style).addTo(group)
      }
      points.forEach((point) => L.circleMarker(point, {
        radius: 5, color: '#167561', weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false,
      }).addTo(group))
      if (points.length >= 2) {
        const anchor = mode === 'line' ? points[points.length - 1] : mode === 'circle' ? points[0] : L.latLngBounds(points).getCenter()
        const text = mode === 'line' ? `Distance: ${lengthText}` : points.length >= minimum ? `Area: ${areaText} · Perimeter: ${lengthText}` : `Perimeter: ${lengthText}`
        L.tooltip({ permanent: true, direction: 'top', className: 'map-measurement-label', offset: [0, -10] }).setLatLng(anchor).setContent(text).addTo(group)
      }
    }
    return () => group.remove()
  }, [mapRef, open, mode, points, lengthText, areaText, minimum])

  const reset = nextMode => { setMode(nextMode); setPoints([]); setFinished(false) }

  const tools = [['line', 'Distance'], ['polygon', 'Area'], ['rectangle', 'Rectangle'], ['circle', 'Circle']]
  return <section className="measurement-control" aria-label="Map measurement">
    <button className="measurement-toggle" aria-expanded={open} title="Measurement tools" onClick={() => setOpen(value => !value)}><MeasureIcon type="ruler"/>Measure</button>
    {open && <div className="measurement-panel">
      <p className="measurement-help">{finished ? resultText : twoPoint ? 'Click two points on the map.' : mode === 'line' ? 'Click two or more points. Choose Finish when done.' : 'Click around the area. Choose Finish when done.'}</p>
      <div className="measurement-modes">
        {tools.map(([id, name]) => <button key={id} aria-label={name} aria-pressed={mode === id} title={`Measure ${name.toLowerCase()}`} onClick={() => reset(id)}><MeasureIcon type={id}/></button>)}
      </div>
      <button className="measurement-clear" title="Clear measurement" aria-label="Clear measurement" onClick={() => reset(mode)}><MeasureIcon type="clear"/></button>
      {!finished && <div className="measurement-actions">
        {points.length > 0 && <button title="Undo last point" aria-label="Undo last point" onClick={() => setPoints(current => current.slice(0, -1))}><MeasureIcon type="undo"/></button>}
        {!twoPoint && points.length >= minimum && <button title="Finish measurement" aria-label="Finish measurement" onClick={() => setFinished(true)}><MeasureIcon type="finish"/>Finish</button>}
      </div>}

    </div>}
  </section>
}
