# Orbit Watch

A standalone 3D Earth and orbital-object explorer by EdgeCase Labs, using GitHub, Three.js, Vite, and Satellite.js. No Sites project is used.

## Run locally

Use Node.js 22.12+ or 24+:

```sh
npm ci
npm run dev
```

Open the HTTP address printed by Vite (normally http://127.0.0.1:5173/). Opening index.html directly from disk will not load the application.

Drag to orbit the camera, scroll to zoom, hover to identify a dot, and click to inspect it. Filters affect both globe and directory. Search by name, NORAD ID, owner code, object type, international designator, or launch year. The directory is paginated in groups of 100. Pause freezes calculated positions; resuming returns to current UTC time. The initial selected object is the ISS.

## Real data and coverage

`public/data/catalog.json` is a saved CelesTrak snapshot containing OMM-compatible orbital elements joined to SATCAT metadata by NORAD ID. It includes:

- The active satellites group.
- Records whose names contain DEB or R/B, adding debris and rocket bodies.
- The latest epoch per NORAD ID across these sources, with cataloged decayed and non-Earth objects excluded.

The included snapshot contains 29,256 unique objects: 11,184 Starlink; 5,657 other payloads; 10,251 debris; 2,161 rocket bodies; ISS and Tiangong core; and one unclassified object. Counts describe this snapshot and can change at the next refresh. This is not a complete catalog of all objects in space. Name-based queries miss some objects, including inactive satellites outside the active group, unnamed objects, and restricted data. Small untracked debris is not included.

Positions and ellipsoidal altitudes are estimated using SGP4/SDP4 from Satellite.js 6.0.2. Orbital elements use UTC, and TEME positions are transformed into Earth-fixed coordinates using Greenwich sidereal time. The globe uses equatorial Earth radius for scale. Markers are enlarged for visibility. A worker calculates all positions approximately every two seconds without blocking the interface. Positions are discrete estimates, not live telemetry. Invalid or decayed propagation results remain searchable but are omitted from the globe, with a failure count shown in Data & coverage.

The UI displays the snapshot download time, current calculation time, and each selected object's orbital epoch. It warns when snapshot downloads are older than 24 hours or an object's epoch differs from now by over 3.5 days. This threshold is a visibility cue, not an accuracy guarantee. Accuracy also depends on maneuvers, drag, and data quality. These estimates are not intended for collision avoidance or operational navigation.

SATCAT OBJECT_TYPE controls object classification; a rocket-named fragment remains debris when the catalog says DEB. ISS (25544) and Tiangong's core (48274) are specially recognized. Other separately cataloged modules and visiting vehicles remain payloads. Owner codes are shown as codes, not assumed to be companies or countries. Status codes are displayed separately from general descriptions. Descriptions explain classes of objects; this feed does not provide verified mission details for every satellite. Unknown details are left unspecified. External strings are escaped before insertion into the page.

## Refresh the saved snapshot

Python 3 is required only for refreshing data, not for serving or building the application:

```sh
npm run data:update
```

This explicitly downloads the four documented sources, caching each for at least two hours in ignored `.cache/orbits/`. Any HTTP or validation error stops the run. A failed run leaves the previous published catalog intact. The script atomically replaces the assembled snapshot after all inputs succeed. No upstream requests occur during normal page loading, building, or testing. **No scheduled upstream refresh is configured.** After refreshing, commit the new `public/data/catalog.json` and rebuild/deploy as needed.

Source URLs and download timestamps are embedded in the snapshot manifest. CelesTrak requests that clients reuse cached data and not fetch more often than every two hours.

## Build and validation

```sh
npm test
npm run build
npm run preview
```

Tests cover enlarged screen-space picking, Earth occlusion, hidden layers, nearest-object selection, classification precedence, unique source IDs, epoch metadata, plausible ISS motion, and full-snapshot propagation. The committed snapshot produced 29,255 valid positions and one explicitly unavailable position at its download timestamp.

Production output is `dist/`. Cloudflare deployment, DNS, the custom domain, PWA installation, and automatic data refresh remain unconfigured.

## Sources and dependencies

- [CelesTrak GP data formats and usage guidance](https://celestrak.org/NORAD/documentation/gp-data-formats.php)
- [CelesTrak SATCAT format and codes](https://celestrak.org/satcat/satcat-format.php)
- [Satellite.js](https://github.com/shashwatak/satellite-js)
- Earth imagery downloaded from the [Three.js example textures](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets). Verify additional image attribution requirements before public release.

Three.js and Satellite.js license notices are included in `THIRD_PARTY_NOTICES.txt`.

## Cloudflare Pages deployment

Connect the private GitHub repository jessdoctrine/orbit.watch using Cloudflare Pages Git integration. Use these settings:

- Project name: orbit-watch (if available)
- Production branch: main
- Framework preset: None
- Build command: npm run build
- Build output directory: dist
- Root directory: repository root (leave blank)
- Node.js: .node-version selects 22.23.4

The catalog snapshot is committed and served as a static asset. No credentials, database bindings, or build-time data downloads are required. The 16.4 MB catalog is below Cloudflare Pages' documented 25 MiB single-asset limit. Connecting GitHub enables new deployments on pushes to main. Deployment is not complete until the Cloudflare dashboard reports success and the assigned pages.dev address is verified. Custom domain and DNS configuration are a separate step.

