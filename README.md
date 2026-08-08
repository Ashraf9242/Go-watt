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

There are no 3D model files in this repository. The car, road, charger, street lamps and
environment props are all built procedurally in code, and every texture is generated in
the browser at start-up — so the scene downloads zero bytes of asset data and carries no
third-party licensing question. Two reference `.glb` files (a Tesla Model 3 and a BYD
Dolphin, 55 MB combined) sit in the working directory but are git-ignored: they are
trademarked designs, unused by the site, and far over the ~4 MB scene budget.
