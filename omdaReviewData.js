export const landRows = [
  {
    id: 'airport', label: 'Total airport land', layers: ['Total_IGIA_Land'],
    agreement: 5106, gis: 4984.38,
    detail: 'The agreement gives the airport-wide baseline. The GIS figure comes from the mapped total airport boundary.',
    source: 'Slide 2 and workbook C21:F22, C25:F25. GIS total airport boundary.',
  },
  {
    id: 'original', label: 'Originally leased to DIAL', layers: ['Demised_Premises'],
    agreement: 4609, gis: 4487.17,
    detail: 'Demised Premises means the land originally leased to DIAL. The GIS figure comes from the mapped original lease boundary.',
    source: 'Slide 2 and workbook C28:F28. GIS Demised Premises.',
  },
  {
    id: 'carved', label: 'Carved out of the DIAL lease', layers: ['Carved_Out_Assets'],
    agreement: 250, gis: 250.12,
    detail: 'Schedule 27 lists these separately from Excluded Premises. The GIS figure adds the mapped carved-out assets. Several boundaries are approximate.',
    source: 'Slides 2–3 and workbook C12:D12, C26:E26. GIS Carved Out Assets.',
  },
  {
    id: 'excluded', label: 'Originally set aside for AAI', layers: ['aai-retained', 'dial-additional'],
    agreement: 247, gis: 247.10,
    detail: 'Excluded Premises were set aside for AAI operations. The summary baseline uses 247 acres. The itemized 247.10 acres later split into 190.19 acres leased to DIAL and 56.91 acres retained by AAI.',
    source: 'Slides 2–4 and workbook C16:D18, C27:E27. GIS Excluded Premises.',
  },
  {
    id: 'nta', label: 'Aerocity assets (NTA)', layers: ['AerocityAssets_NTA'],
    agreement: 230.45, gis: 110.94,
    detail: 'The 5% reference uses 4,608.90 acres as its base. The GIS figure comes from the mapped Aerocity asset records and is a separate asset measure.',
    source: 'Slide 2 and workbook C31:D31. GIS Aerocity Assets NTA.',
  },
  {
    id: 'property', label: 'Mapped DIAL property boundary', layers: ['IGI_DIAL_Property_Boundary'],
    gis: 4733.94,
    detail: 'This acreage is stored on the GIS property boundary. The sum of the original DIAL lease and the additional leased area in the mapped records is 4,677.36 acres. The 56.58-acre difference needs a boundary and scope check.',
    source: 'GIS IGI DIAL Property Boundary, Area_Ac. The source summaries have no matching figure.',
  },
]

export const leaseRows = [
  {
    id: 'transfer', label: 'Leased back to DIAL in 2009', layers: ['dial-additional'], gis: 190.19,
    detail: 'The Supplementary Lease Deed dated 13 August 2009 moved 190.19 acres from the Excluded Premises into DIAL’s lease as Additional Demised Premises. This changes the allocation within the airport.',
    source: 'Slides 2 and 4 and workbook A14, C16:D16. GIS Additional Demised Premises feature.',
  },
  {
    id: 'retained', label: 'Excluded land kept by AAI', layers: ['aai-retained'], gis: 56.91,
    detail: '247.10 acres originally set aside minus 190.19 acres leased back leaves 56.91 acres of Excluded Premises with AAI.',
    source: 'Slide 2 and workbook C16:D18. GIS retained Excluded Premises feature.',
  },
  {
    id: 'dial', label: 'DIAL after the 2009 lease', layers: ['Demised_Premises', 'dial-additional'], gis: 4677.36,
    detail: '4,487.17 mapped acres from the original lease plus 190.19 leased in 2009 gives 4,677.36 acres. Both documents show a rounded 4,800-acre reference and leave the surveyed DIAL total blank.',
    source: 'Slide 2 and workbook C30:D30. Calculation uses the two mapped lease Area_Ac values.',
  },
  {
    id: 'aai', label: 'AAI allocation after the 2009 lease', layers: ['Carved_Out_Assets', 'aai-retained'], gis: 307.03,
    detail: '250.12 mapped acres carved out plus 56.91 retained gives 307.03 acres, matching the workbook survey total. The deck prints 306.91 using a rounded 250-acre carve-out.',
    source: 'Slide 2 and workbook C29:E29. Calculation uses the two mapped Area_Ac values.',
  },
]

export const acres = value => value == null ? '—' : value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export const landStyles = {
  Total_IGIA_Land: { color: '#435568', weight: 2.5, fillOpacity: 0, dashArray: '9 5' },
  IGI_DIAL_Property_Boundary: { color: '#7138a3', weight: 2.5, fillOpacity: 0, dashArray: '3 4' },
  AerocityAssets_NTA: { color: '#005fab', weight: 2, fillOpacity: 0.24 },
  Demised_Premises: { color: '#087b73', weight: 2, fillOpacity: 0.13 },
  Carved_Out_Assets: { color: '#a04c0a', weight: 2, fillOpacity: 0.27 },
  'aai-retained': { color: '#a12d63', weight: 2.5, fillOpacity: 0.25, dashArray: '4 3' },
  'dial-additional': { color: '#4e741c', weight: 2.5, fillOpacity: 0.26, dashArray: '7 4' },
}

export const excludedFeatureId = feature => feature.properties?.Names === 'Additional Demised Premises' ? 'dial-additional' : 'aai-retained'

export const landLegend = {
  Total_IGIA_Land: 'Airport outline',
  Demised_Premises: 'Original DIAL lease',
  Carved_Out_Assets: 'Carved out of DIAL lease',
  'aai-retained': 'Excluded land retained by AAI',
  'dial-additional': '2009 lease to DIAL',
  IGI_DIAL_Property_Boundary: 'DIAL property outline',
  AerocityAssets_NTA: 'Aerocity NTA parcels',
}
