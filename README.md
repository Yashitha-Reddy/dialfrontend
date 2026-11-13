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

The map opens on the layer panel with the DIAL orthophoto switched on and no vector layers shown. Use the Ortho photo button beside the basemap picker to hide it. Open OMDA Lands in the layer panel and use its Compare tab to compare the 2006 agreement with the Geokno survey, or its Follow the lease tab to see the 2009 allocation. Select a category to switch on and highlight its layers, and select it again to clear the highlight. Use Measure to draw an area or distance.

The layer panel holds the full catalog and individual layer controls. The six OMDA Lands datasets are bundled under `public/Layer_Wise_Data_GeoJSON/omda_lands/`. Serve other catalog datasets and original GIS or raster files separately at the catalog paths.

Selected OMDA layers also show a table button beside the zoom control. Open it to view the layer's attributes in a floating panel inside the map. Click a row, or focus its feature button and press Enter, to highlight and zoom to that feature. Clear selection removes the highlight; closing the table or hiding its layer also clears it. Attribute tables are available only for selected OMDA layers.
