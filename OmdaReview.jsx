import React from 'react'
import { acres, landRows, leaseRows } from './omdaReviewData'
import './OmdaReview.css'

const tabs = [['compare', 'Compare areas'], ['lease', 'Follow the lease']]

export default function OmdaReview({ view, setView, focus, showLand }) {
  const selected = view === 'lease'
    ? leaseRows.find(row => row.id === focus) || leaseRows[0]
    : landRows.find(row => row.id === focus) || landRows[0]

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
          <tbody>{landRows.map(row => <tr key={row.id} className={focus === row.id ? 'review-selected' : undefined}>
            <th scope="row"><button aria-pressed={focus === row.id} onClick={() => showLand(focus === row.id ? null : row)}>{row.label}</button></th>
            <td>{acres(row.agreement)}</td><td>{acres(row.gis)}</td>
          </tr>)}</tbody>
        </table>
        {selected.agreement != null && selected.gis != null &&
          <p className="review-difference">{acres(Math.abs(selected.gis - selected.agreement))} acres {selected.gis === selected.agreement ? 'difference' : selected.gis > selected.agreement ? 'above the reference' : 'below the reference'}</p>}
      </>}
      {view === 'lease' && <>
        <div className="review-lease-intro">
          <h2>2006 allocation</h2>
          <p><strong>5,106 acres</strong> in the agreement summary: 4,609 leased to Delhi International Airport Limited (DIAL), 250 carved out and 247 set aside for the Airports Authority of India (AAI).</p>
          <h2>13 August 2009 lease</h2>
          <p>AAI divided the detailed <strong>247.10 acres</strong> of Excluded Premises into two parts.</p>
        </div>
        <div className="review-allocation">
          {leaseRows.slice(0, 2).map(row => <button key={row.id} aria-pressed={focus === row.id} onClick={() => showLand(focus === row.id ? null : row)}>
            <strong>{acres(row.gis)} acres</strong><span>{row.label}</span>
          </button>)}
        </div>
        <h2 className="review-subtitle">After the lease · mapped acres</h2>
        <div className="review-allocation">
          {leaseRows.slice(2).map(row => <button key={row.id} aria-pressed={focus === row.id} onClick={() => showLand(focus === row.id ? null : row)}>
            <strong>{acres(row.gis)} acres</strong><span>{row.label}</span>
          </button>)}
        </div>
        <p className="review-hint">The two mapped allocations sum to 4,984.39 acres. The GIS airport boundary record shows 4,984.38 acres.</p>
      </>}
      <div className="review-detail">
        <h2>{selected.label}</h2>
        <p>{selected.detail}</p>
      </div>
    </div>
  </section>
}
