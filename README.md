# GoWatt

Pre-launch marketing site for **Go Watt**, an EV charging platform for Oman — built as
a single bilingual (Arabic RTL / English LTR) scroll journey in which a 3D electric car
drives along a winding road from the hero down to a "battery full" finale.

The site provides **no live service**: no real login, booking, map, charging or payment.
Every interface that depicts one of those is labelled in the visible copy as an
illustration of the future app. The two things that genuinely work are the app waitlist
form and the home-charger sharing form.

## Getting started

The application lives in [`gowatt/`](gowatt/):

```bash
cd gowatt
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the build on `:4173` |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | Road-geometry and timeline assertions (no browser needed) |
| `npm run smoke` | Drives a real Chrome through the built site |

See [`gowatt/README.md`](gowatt/README.md) for the full documentation: how the scroll
journey works, how to edit the timeline and the road's control points, how to add a
scene, how to wire the forms to real storage, and the list of known gaps.

## Repository layout

```
gowatt/                  The site (React + Vite + TypeScript + three.js + GSAP)
brand/                   Logos, icons, source artwork
fonts/                   Self-hosted IBM Plex Sans Arabic + Montserrat
go-watt-master-plan.txt  The original project brief
EVO Chargers.kml         Third-party charger feed — deliberately unused
```

## Note on 3D assets

The car is a real, licensed-status-unconfirmed **Tesla Model 3** model — used at the
project owner's explicit direction, after being told plainly that it's a trademarked
design with no license documentation in this repository, and choosing to proceed
anyway. The road, charger, street lamps and environment props remain built procedurally
in code, with every texture generated in the browser at start-up.

The car ships as two compressed `.glb` files under `gowatt/public/models/`
(`tesla-model-3.glb` ~2.4 MB, `tesla-model-3-lite.glb` ~1.2 MB), compressed down from the
raw 22 MB source via `gltf-transform` (mesh simplification + WebP textures; see
[`gowatt/README.md`](gowatt/README.md#the-car-model) for the exact pipeline, the axis/
scale bugs that turned up along the way, and what "compressed" actually cost in detail).
The raw 22 MB source and the still-entirely-unused 34 MB BYD Dolphin file are git-ignored
(see `.gitignore` for why) — only the small, derived, actually-used files are tracked.

**Before this goes anywhere real: get the Sketchfab listing's actual commercial license
in writing.** Nothing in this repository does that for you.
