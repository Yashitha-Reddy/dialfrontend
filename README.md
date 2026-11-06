# dialfrontend

DIAL GIS frontend components, styles, layer catalog, and preview images.

## Files

- `MapView.jsx`: React and Leaflet map interface.
- `MeasurementControl.jsx`: map measurement controls.
- `App.css` and `index.css`: application styles.
- `layer-manifest.json`: GIS layer catalog.
- `index.html`: application HTML entry point.
- `*-preview.png`: interface previews.

## Demo login

Sign in with username `test_user` and password `123456`. Sign out returns to the login screen; refreshing also ends the in-memory session. Invalid credentials display an error. The map mounts only after a successful sign-in.

This is a client-side demo gate, not server authentication. Credentials are visible in the frontend source and do not protect GIS data or API endpoints. Replace this gate with backend authentication before production use. Include `Login.css` alongside `MapView.jsx` when integrating the components.

## Application setup

These files are frontend components rather than a complete runnable application. The repository currently has no package manifest, build configuration, or React entry point.

In a React application with Leaflet installed, place the JSX components and styles in `src/`, keep `layer-manifest.json` at the project root, and render `MapView` from the application entry point. Import the supplied styles there. The HTML entry expects `/src/main.jsx`.

The catalog references GeoJSON files under `/Layer_Wise_Data_GeoJSON/`. Those files and the original GIS/raster datasets are not included in this repository and must be served separately at the catalog paths.
