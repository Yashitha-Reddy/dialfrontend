import React from 'react'
import { acres, landRows, landStyles, leaseRows } from './omdaReviewData'
import './OmdaReview.css'

const tabs = [['compare', 'Compare areas'], ['lease', 'Follow the lease']]

export function LayerInfoButton({ row, name = row.label, onInfo }) {
  return <button type="button" className="review-info-button" style={{ color: landStyles[row.layers[0]].color }}
    aria-label={`Information about ${name}`} aria-haspopup="dialog" title={`Information about ${name}`}
    onClick={() => onInfo(row)}>
    <span aria-hidden="true">i</span>
  </button>
}

export default function OmdaReview({ view, setView, focusedRow, showLand, enabled, onInfo }) {
  const focus = focusedRow?.id

  function rowButton(row) {
    return {
      'aria-pressed': focus === row.id,
      disabled: !row.layers.some(id => enabled.has(id)),
      onClick: () => showLand(focus === row.id ? null : row),
    }
  }

  function changeView(next) {
    setView(next)
    showLand(null)
  }

  return <section className="land-review" aria-label="OMDA land review">
    <div className="review-intro">
      <span className="review-kicker">IGI AIRPORT · OMDA</span>
      <h1>Airport land review</h1>
      <p>See how the airport land allocation compares with mapped acreage and how the 2009 lease changed it.</p>
    </div>
    <nav className="review-tabs" aria-label="Land review sections">
      {tabs.map(([id, name]) => <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => changeView(id)}>{name}</button>)}
    </nav>
    <div className="review-scroll">
      {view === 'compare' && <>
        <h2 className="review-subtitle">Compare 2006 agreement with GIS records</h2>
        <table className="review-comparison">
          <caption>Areas in acres. Select a category to highlight it. Select it again to clear.</caption>
          <thead><tr><th scope="col">Land category</th><th scope="col">2006 agreement</th><th scope="col">GIS records</th></tr></thead>
          <tbody>{landRows.map(row => <tr key={row.id} className={focus === row.id ? 'review-selected' : undefined} style={{ '--review-layer-color': landStyles[row.layers[0]].color }}>
            <th scope="row"><div className="review-label-with-info"><button className="review-category-button" {...rowButton(row)}>
              {row.layers.length > 1 && <span className="review-label-swatches" aria-hidden="true">
                {row.layers.map(id => <i key={id} style={{ backgroundColor: landStyles[id].color }}/>)}
              </span>}
              <span>{row.label}</span>
            </button>
              <LayerInfoButton row={row} onInfo={onInfo}/>
            </div></th>
            <td>{acres(row.agreement)}</td><td>{acres(row.gis)}</td>
          </tr>)}</tbody>
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
            <button className="review-allocation-select" {...rowButton(row)}>
              <strong>{acres(row.gis)} acres</strong><span style={{ color: landStyles[row.layers[0]].color }}>{row.label}</span>
            </button>
            <LayerInfoButton row={row} onInfo={onInfo}/>
          </div>)}
        </div>
        <h2 className="review-subtitle">After the lease · mapped acres</h2>
        <div className="review-allocation">
          {leaseRows.slice(2).map(row => <div className="review-allocation-card" key={row.id}>
            <button className="review-allocation-select" {...rowButton(row)}>
              <strong>{acres(row.gis)} acres</strong><span style={{ color: landStyles[row.layers[0]].color }}>{row.label}</span>
            </button>
            <LayerInfoButton row={row} onInfo={onInfo}/>
          </div>)}
        </div>
        <p className="review-hint">The two mapped allocations sum to 4,984.39 acres. The GIS airport boundary record shows 4,984.38 acres.</p>
      </>}
    </div>
  </section>
}
