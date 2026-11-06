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

Opening the app shows the login screen first. Sign in with username `test_user` and password `123456`. The Logout button in the map header returns to the login screen and clears the form; refreshing also ends the in-memory session. Invalid credentials display an error. The map mounts only after a successful sign-in.

This is a client-side demo gate, not server authentication. Credentials are visible in the frontend source and do not protect GIS data or API endpoints. Replace this gate with backend authentication before production use. Include `Login.css` alongside `MapView.jsx` when integrating the components.

## Application setup

Run `npm install`, then `npm run dev` to open the application locally. Run `npm run build` to generate the production site in `dist/`, or `npm run preview` to preview that build.

For deployment, configure a static hosting service to run `npm run build` and publish `dist/`. The GitHub repository URL displays source code; use the hosting service's deployed site URL to access the login page.

The catalog references GeoJSON files under `/Layer_Wise_Data_GeoJSON/`. The six OMDA Lands datasets are included under `public/Layer_Wise_Data_GeoJSON/omda_lands/`, with a distinct color for each layer. Expand OMDA Lands in the layer panel to toggle them or zoom to their extent. Other catalog datasets and original GIS/raster datasets must be served separately at the catalog paths.
