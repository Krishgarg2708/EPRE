# EPRE — Emergency Priority Routing Engine (v1, frontend prototype)

A frontend-only emergency operations command centre for Delhi NCR, built for demonstration.
**Everything runs on simulated data.** EPRE does not dispatch ambulances, control traffic signals,
or read real hospital capacity, and must not be used for real emergency response.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Requires Node 18+ (tested on Node 22). No API keys or backend are needed.

For static hosting without SPA fallback (e.g. GitHub Pages), build with hash routing:

```bash
VITE_ROUTER=hash npx vite build --base ./
```

## Stack

React 18 · TypeScript (strict) · Vite 5 · Tailwind CSS 3 · React Router 6 · Zustand (persisted state) ·
Leaflet + React Leaflet · Recharts · Framer Motion · Lucide icons.

## What works

| Area | Highlights |
| --- | --- |
| Command Center | Six live metrics derived from state, geospatial map with route overlays, incident queue, route recommendation with explanation, activity feed |
| Live Operations Map | Full-bleed map, collapsible incident list, filters (priority, status, units, hospitals), search, context panel, zoom-to actions, layer toggles, legend, full-screen |
| Emergency Incidents | Search, filters, sorting, pagination, CSV export, create/edit with validation, detail page with workflow stepper, assign, route review, hospital selection, dispatch → complete, cancel with confirmation |
| Route Intelligence | Three candidate routes, transparent weighted scoring, configurable weights, missing-data handling, stale-snapshot detection, deterministic recalculation, score-breakdown & delay-range charts |
| Ambulance Fleet | Status summary, table, detail drawer, notes, manual Available/Offline/Maintenance, assignment with unavailable-unit protection |
| Hospital Network | Directory, capability/availability/travel-time filters, suitability ranking with reasons, compare up to 3, simulated availability updates |
| Traffic & Signal Priority | Time-slice congestion snapshots, segment list with route impact, simulated signal-priority request workflow (confirm → pending → deterministic result), history and timeline |
| Analytics & Reports | 8 charts from the shared dataset, date range / priority / type filters, metric selector, CSV export, print view |
| Notifications & Settings | Unread counts, read/unread, filtering, deep links; theme, map, weights, units, density, notifications, simulation mode, reset demo data |

## Route scoring model (demo defaults)

```
score = 0.50·norm(travelTime) + 0.20·norm(congestion) + 0.15·norm(signalDelay) + 0.15·norm(roadRisk)
norm(x) = (x − min) / max(max − min, 0.25·max)      lower score = better
```

Missing inputs are normalised to 1.0 (worst) and reduce the route's input-completeness indicator.
Weights are editable in Route Intelligence or Settings. They are demonstration values, not
medically validated or operationally approved rules.

## Project structure

```
src/
  app/          router, error boundary
  components/   layout, dashboard, maps, incidents, routing, hospitals, ui
  pages/        one file per navigation item + incident detail
  context/      Zustand store (persisted), toast store
  data/         seeded Delhi NCR demo data, constants, replaceable map tile config
  hooks/        route analysis, ETAs, clock, recalculation
  utils/        routing engine, recommendations, geo, PRNG, formatting, CSV
  types/        shared domain types
```

## Known limitations

- **Simulated route geometry.** Routes are grid-snapped curves between origin and destination, not
  real road navigation; travel times are model outputs. Hospital legs use a straight-line × 1.35
  road-factor estimate and are labelled as such. A real routing service (e.g. self-hosted OSRM) can
  replace `src/utils/routing.ts#generateRoutes`.
- **Map tiles** come from public OpenStreetMap / CARTO servers (demo-volume use only; see their
  usage policies). Offline or blocked, the map falls back to a grid with all overlays intact.
  Change providers in `src/data/mapConfig.ts`.
- **Ambulance positions** are derived deterministically from workflow stage (base → midpoint →
  pickup → hospital), not continuous GPS.
- **Persistence** is per-browser `localStorage`. The optional demo contact field is never persisted.
- No authentication, roles, or multi-user sync (planned for the backend phase).
- Marker clustering is not implemented (not needed at the demo's ~40 markers).
