# dialfrontend

DIAL GIS frontend components, styles, layer catalog, and preview images.

## Files

- `MapView.jsx`: React and Leaflet map interface.
- `MeasurementControl.jsx`: map measurement controls.
- `App.css` and `index.css`: application styles.
- `layer-manifest.json`: GIS layer catalog.
- `index.html`: application HTML entry point.
- `*-preview.png`: interface previews.

## Integration

These files are frontend components rather than a complete runnable application. The repository currently has no package manifest, build configuration, or React entry point.

In a React application with Leaflet installed, place the JSX components and styles in `src/`, keep `layer-manifest.json` at the project root, and render `MapView` from the application entry point. Import the supplied styles there. The HTML entry expects `/src/main.jsx`.

The catalog references GeoJSON files under `/Layer_Wise_Data_GeoJSON/`. Those files and the original GIS/raster datasets are not included in this repository and must be served separately at the catalog paths.
