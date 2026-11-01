# Orbit Watch

A standalone 3D Earth explorer by EdgeCase Labs. Built with JavaScript, Three.js, and Vite; source managed in GitHub. No Sites plugin or hosted Sites project is used.

## Run locally

Install Node.js 22.12+ or 24+, then run:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. Drag to orbit the camera, scroll to zoom, click an object to inspect it, or select an entry in the directory. Pause stops the simulated motion. Category filters affect both the globe and directory. Search supports name, operator, purpose, country, year, and demo ID.

## Data status

**This first prototype uses 180 fictional catalog entries and simulated circular motion. It does not show real satellite locations.** Demo IDs are not NORAD IDs. Altitudes, inclinations, operator names, launch years, and all other catalog fields are illustrative. Real orbital propagation and verified satellite metadata are future work. No live-data claims should be added until a verified data source and epoch are displayed.

## Production build

```sh
npm run build
npm run preview
```

The static production output is `dist/`. Cloudflare deployment, DNS changes, the custom domain, and Windows app installation have not been configured. PWA support is planned.

## Project files

- `src/main.js`: 3D scene and interface interactions
- `src/catalog.js`: deterministic fictional demo catalog and category definitions
- `src/style.css`: responsive dark interface
- `public/earth.jpg`: Earth texture from the Three.js examples repository

## Third-party asset

The Earth texture was downloaded from the [Three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets). Three.js is MIT licensed; its license is included in `THIRD_PARTY_NOTICES.txt`. Verify any additional image attribution requirements before public release.
