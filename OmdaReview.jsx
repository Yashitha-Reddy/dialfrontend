import React from 'react'
import { acres, landRows, landStyles, leaseRows } from './omdaReviewData'
import './OmdaReview.css'

export function LayerInfoButton({ row, name = row.label, onInfo }) {
  return <button type="button" className="review-info-button" style={{ color: landStyles[row.layers[0]].color }}
    aria-label={`Information about ${name}`} aria-haspopup="dialog" title={`Information about ${name}`}
    onClick={() => onInfo(row)}>
    <span aria-hidden="true">i</span>
  </button>
}

// Compare and Follow the lease views, shown inside the OMDA Lands section of the layer panel.
export default function OmdaReview({ view, focusedRow, showLand, onInfo, isRowVisible, toggleRow }) {
  const focus = focusedRow?.id

  function rowButton(row) {
    return {
      'aria-pressed': focus === row.id,
      onClick: () => showLand(focus === row.id ? null : row),
    }
  }

  function rowCheckbox(row) {
    return <input type="checkbox" className="review-row-checkbox" aria-label={`Show ${row.label} on the map`}
      checked={isRowVisible(row)} onChange={event => toggleRow(row, event.target.checked)}/>
  }

  function comparisonRow(row, { groupHeading = false, part = false, gis = row.gis } = {}) {
    const rowClass = [
      focus === row.id && 'review-selected',
      groupHeading && 'review-comparison-group-heading',
      part && 'review-comparison-part',
    ].filter(Boolean).join(' ')
    return <tr key={row.id} className={rowClass} style={{ '--review-layer-color': landStyles[row.layers[0]].color }}>
      <th scope={groupHeading ? 'rowgroup' : 'row'}>
        <div className="review-label-with-info">
          {rowCheckbox(row)}
          <button className="review-category-button" {...rowButton(row)}>
            {row.layers.length > 1 && <span className="review-label-swatches" aria-hidden="true">
              {row.layers.map(id => <i key={id} style={{ backgroundColor: landStyles[id].color }}/>)}
            </span>}
            <span>{row.label}</span>
          </button>
          <LayerInfoButton row={row} onInfo={onInfo}/>
        </div>
      </th>
      <td>{acres(row.agreement)}</td>
      <td>{groupHeading ? gis.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : acres(gis)}</td>
    </tr>
  }

  return <section className="land-review" aria-label="OMDA land review">
    <div className="review-scroll">
      {view === 'compare' && <>
        <h2 className="review-subtitle">Compare 2006 agreement with Geokno survey</h2>
        <table className="review-comparison">
          <caption>Areas in acres. Select a category to show and highlight it on the map. Select it again to clear.</caption>
          <thead><tr><th scope="col">Land category</th><th scope="col">2006 agreement</th><th scope="col">Geokno survey</th></tr></thead>
          {landRows.map(row => {
            if (row.id !== 'excluded') return <tbody key={row.id}>{comparisonRow(row)}</tbody>

            const parts = row.layers.map(id => leaseRows.find(part => part.layers.length === 1 && part.layers[0] === id))
            const gisTotal = parts.reduce((sum, part) => sum + part.gis, 0)
            return <tbody className="review-comparison-group" key={row.id}>
              {comparisonRow(row, { groupHeading: true, gis: gisTotal })}
              {parts.map(part => comparisonRow(part, { part: true }))}
            </tbody>
          })}
        </table>
      </>}
      {view === 'lease' && <>
        <div className="review-lease-intro">
          <h2>2006 allocation</h2>
          <p><strong>5,106 acres</strong> in the agreement summary: 4,609 leased to Delhi International Airport Limited (DIAL), 250 carved out and 247 set aside for the Airports Authority of India (AAI).</p>
          <h2>13 August 2009 lease</h2>
          <p>AAI divided the detailed <strong>247.10 acres</strong> of Excluded Premises into two parts.</p>
        </div>
        <div className="review-allocation">
          {leaseRows.slice(0, 2).map(row => <div className="review-allocation-card" key={row.id}>
            {rowCheckbox(row)}
            <button className="review-allocation-select" {...rowButton(row)}>
              <strong>{acres(row.gis)} acres</strong><span style={{ color: landStyles[row.layers[0]].color }}>{row.label}</span>
            </button>
            <LayerInfoButton row={row} onInfo={onInfo}/>
          </div>)}
        </div>
        <h2 className="review-subtitle">After the lease · mapped acres</h2>
        <div className="review-allocation">
          {leaseRows.slice(2).map(row => <div className="review-allocation-card" key={row.id}>
            {rowCheckbox(row)}
            <button className="review-allocation-select" {...rowButton(row)}>
              <strong>{acres(row.gis)} acres</strong><span style={{ color: landStyles[row.layers[0]].color }}>{row.label}</span>
            </button>
            <LayerInfoButton row={row} onInfo={onInfo}/>
          </div>)}
        </div>
        <p className="review-hint">The two mapped allocations sum to 4,984.39 acres. The Geokno survey of the airport boundary shows 4,984.38 acres.</p>
      </>}
    </div>
  </section>
}
