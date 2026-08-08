# Go Watt — 3D scroll experience

A bilingual (Arabic RTL default / English LTR) pre-launch marketing site for Go Watt,
built as one continuous scroll journey: a real Tesla Model 3 model drives along a
winding road from the hero down to a "battery full" finale, with HTML overlay cards
narrating each beat. **The car's licensing status is unconfirmed — read "The car model"
below before you assume this is safe to ship anywhere real.**

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve dist/ on :4173

npm run typecheck  # tsc, no emit
npm run verify      # road-path + timeline checks (no browser needed)
npm run smoke       # drives a real Chrome through the built site
```

---

## What is and isn't real

This is a **pre-launch site**. It provides no live service: no real login, booking,
map, charging or payment. Every UI card that depicts one of those is marked as an
illustration in the visible copy (`badge.simulation` in the dictionary) and carries a
dashed `.gw-sim` treatment.

Two things on the site are genuinely functional: the **app waitlist** form and the
**home-charger sharing** form.

No metric about the unlaunched app is presented as fact anywhere. Amounts, station
locations, charging power and time remaining are all labelled as examples.

---

## Layout

```
index.html            Arabic journey (the 3D experience)
en/index.html         English journey — a real page, with a no-JS static version
                      of the whole journey inside #root for crawlers
about.html            Canvas-free text pages. These load no WebGL code at all:
faq.html              faster, cleanly indexable, and appropriate for reading.
privacy.html
terms.html

src/
  journey/
    scenes.ts             ← the timeline. Weights, per-scene scroll ranges, track heights
    useScrollJourney.ts   ← ScrollTrigger → progress, plus per-card reveals
  three/
    road.ts               ← control points, CatmullRomCurve3, road ribbon, lamp layout
    Car.tsx               ← loads the Tesla model (public/models/), LOD, wheel-roll, charge glow
    Environment.tsx       ← road, lamps, charger, service props, coverage plate, particles
    Rig.tsx               ← car rig + camera rig (reads progress every frame)
    Scene.tsx             ← canvas, day/night lighting, fog, render-loop governor
    textures.ts           ← every texture, generated on the client (zero download)
  components/
    Scenes.tsx            ← the 14 overlay beats
    Chrome.tsx            ← loader, header, sticky CTA, footer, tier switch
    RegisterDialog.tsx    ← the two real forms
    Fallback2D.tsx        ← the complete no-WebGL journey
    ui.tsx                ← SceneTrack, Card, StateBadge, ProgressBar, Accordion
  i18n/dict.ts            ← all AR + EN copy
  lib/capability.ts       ← device/network/motion detection → render tier
  lib/submit.ts           ← the only place forms talk to a backend
  store/journey.ts        ← Zustand store + the per-frame `motion` object
scripts/
  verify-path.ts          ← geometry + timeline assertions
  smoke.mjs               ← browser end-to-end checks
```

---

## How the scroll journey works

`#journey` is one tall element; its height is the sum of every scene's `vh` in
`scenes.ts`. A single `ScrollTrigger` maps that element to a normalised `0 → 1`
value.

That value is written to `motion.progress` — **a plain mutable object, not React
state**. The car and camera read it inside `useFrame`, so scrolling causes zero
re-renders. Only discrete derivatives (current scene, whole-number charge
percentage, completion flag) go through the store, each throttled to actual
changes; the whole journey costs a few dozen React renders rather than one per
scroll event.

The car's position is `curve.getPointAt(progress)` and its heading comes from
`curve.getTangentAt(progress)`, which is what makes it turn into the bends instead
of sliding sideways.

### Editing the timeline

Change a `weight` in `SCENES` (`src/journey/scenes.ts`) to give a beat more or less
scroll distance; ranges are derived from the weights, so nothing else needs
touching. `vh` controls how tall that scene's DOM track is. `camera` picks a camera
profile from `PROFILES` in `Rig.tsx`.

### Editing the road's shape

Edit `CONTROL_POINTS` in `src/three/road.ts` — one point per beat, X zigzagging and
Z running forward — then run:

```bash
npm run verify
```

That is not optional. It asserts, among other things, that **no corner is tighter
than a 16-unit radius**. The car is 4.3 units long; below that threshold it visibly
pivots on the spot instead of driving, which looks fine in a still frame and wrong
in motion. The first draft of this road had 6-unit corners for exactly that reason.

It also asserts the road ribbon's **normals point up**. Reversing the triangle
winding in `buildRoadGeometry` makes the entire road invisible from above with no
error logged anywhere — a bug worth having a test for.

### Adding a scene

1. Add an id to `SceneId` and an entry to `RAW` in `scenes.ts` (weight, vh, camera).
2. Add a control point at the matching position in `CONTROL_POINTS`.
3. Add copy under `scenes` in both `ar` and `en` in `i18n/dict.ts`.
4. Add a component in `Scenes.tsx` wrapped in `<SceneTrack id="…">`, and render it
   in `<Scenes />`. Give cards `data-reveal` to opt into the entrance animation.
5. Add the beat to `Fallback2D.tsx` too — the no-WebGL journey is a complete
   experience, not a summary.
6. `npm run verify && npm run smoke`.

---

## The car model

**This section changed.** `Car.tsx` used to build an original, license-safe generic
crossover procedurally — zero download weight, zero licensing question, matching the
project brief's explicit instruction. It was replaced with the real Tesla Model 3 model
at the project owner's direction, after being told directly that it's a trademarked
design with no license documentation anywhere in this repository, and choosing to
proceed anyway. If you're reading this before that conversation happened for you too:
**stop and get the actual commercial license in writing before this goes anywhere
real.** Nothing about the file compiling or the site building cleanly means that check
happened.

The original procedural car is gone from `Car.tsx` but still in git history
(`git log -- src/three/Car.tsx`) if this ever needs to be reverted — that revert is a
single-file change, nothing else in the scene depends on which car is loaded.

### Where it came from, and what shipping it actually took

Source: `tesla_2018_model_3.glb` in the project root, a Sketchfab export
(`generator: Sketchfab-12.68.0` in the file's own metadata) with no accompanying
license file. Raw size: 22.7 MB, ~394K vertices, 176 mesh primitives, 17 embedded PNG
textures. Compressed via `gltf-transform` into two files under `public/models/`:

| File | Size | Used for |
| --- | --- | --- |
| `tesla-model-3.glb` | ~2.4 MB | `tier: 'full'`, near-camera LOD |
| `tesla-model-3-lite.glb` | ~1.2 MB | `tier: 'lite'`; far-camera LOD for `tier: 'full'` |

Pipeline (run from `gowatt/`, against the root-level source file):

```bash
npx gltf-transform optimize ../tesla_2018_model_3.glb public/models/tesla-model-3.glb \
  --compress meshopt --flatten false --join false --instance false \
  --simplify true --simplify-ratio 0.35 --simplify-error 0.0015 \
  --texture-compress false --palette true --prune true --weld true
```

`--flatten false --join false` is not optional — the default `optimize` preset merges
and renames nodes for fewer draw calls, which would destroy the `wheels` / `wheels.001`
node names the wheel-roll animation depends on (see below). Texture compression runs as
a **separate** pass, because `gltf-transform`'s bundled `--texture-compress` step
crashes on every texture in this specific file (`colourspace: parameter space not set`,
from every angle it looks like a bug in how `@gltf-transform/functions` hands a texture
buffer to `sharp` for this asset, not anything wrong with the textures themselves —
copying the bytes first, `Buffer.from(texture.getImage())`, avoids it completely). The
lite variant repeats this with `--simplify-ratio 0.12` and a smaller texture cap.

This is well above the brief's original 1–2 MB target for a *procedural, low-poly*
car — appropriate for that kind of asset, not for a full-detail licensed one. 2.4 MB is
the honest number for what this actually is.

### The bug that ate most of this work: axis correction that shouldn't have existed

The file's node graph *looks* like it needs an axis fix — the model's raw local
coordinates read as Z-up/Y-forward, the opposite of this scene's Y-up/Z-forward. A
hand-derived correction for that (verified numerically against the model's own
front/rear hub coordinates) produced a car standing on its bumper, twisted into an
unrecognisable heap. The actual cause: the file's root node (`"Tesla Model 3"`) already
carries its own axis correction — a −90°-about-X rotation plus a ×100 unit-scale
factor, both standard Blender/Sketchfab export artifacts — and glTF loaders always
apply node transforms. The hand-derived fix was stacking a second, unwanted rotation on
top of one the file already had. It only showed up because the *node translations* I'd
inspected earlier (to derive that fix) don't reflect ancestor scale/rotation — the
model's real, rendered bounding box does, and that's what exposed the double-rotation.
The eventual fix in `Car.tsx` (`TeslaVariant`) is almost embarrassingly simple: no axis
correction at all, just a plain Y-yaw, plus scale and ground/centre position computed
from the model's actual bounding box at mount time rather than hand-typed constants —
robust against the exact numbers shifting if this pipeline is ever re-run.

**If you ever touch `AXIS_FIX` in `Car.tsx`: rebuild, screenshot, and look at it.**
Numbers that check out on paper are not the same as a car that looks like a car.

### How the rig survives not knowing what's inside the file

- **Wheel roll.** `wheels` and `wheels.001` are the two node names actually confirmed
  (by loading the real scene graph, not guessing) to contain wheel-only geometry.
  `Car.tsx` collects every node matching `/^wheels(\.\d+)?$/i` and rotates them on
  their local X axis, scaled by distance travelled — same mechanism the procedural car
  used, just matching real node names instead of a hand-authored `gw-wheel` tag.
- **Charge-port glow.** Rather than hunting through ~40 real materials for whichever
  one might be a charging port, there is none dedicated to it — a small separate glow
  decal is parented onto the model and positioned from its bounding box. This is the
  same "never rely on knowing what's inside someone else's asset" logic as the wheels.
- **Finale spin, LOD, day/night lighting.** All operate on the outer wrapper group or
  the scene's own lights — they never needed to know what's inside the model at all.

### If you re-run this pipeline

Re-verify by loading the output and checking the actual node names survived:

```js
// see scripts/verify-path.ts for the pattern; wheel nodes must still exist post-export
root.listNodes().filter(n => /^wheels(\.\d+)?$/i.test(n.getName()))
```

And re-screenshot. The axis bug above passed every "does it compile" check there is.

---

## Day / night

Day is the default. Night is a user toggle (persisted in `localStorage`), and it
changes five things together: the CSS token block on `:root[data-mode="night"]`, the
3D sun and ambient light, the street-lamp `PointLight` intensities (0 in day mode —
which is what makes the toggle read as "the lights just came on"), the displayed logo
variant, and the glow on the amber centre line.

The amber road centre line stays amber in both modes. Amber is never used as text on
a light background; `--amber-text-safe` (#B4741F) exists for that.

Only a handful of real lights ever exist: the nearest few lamps to the car get
`PointLight`s that follow them, with a soft sprite pool on the tarmac. Lighting 26
lamps individually would be the single most expensive thing in the scene.

---

## Performance and the 2D fallback

`lib/capability.ts` resolves a tier **before any 3D code is requested**:

| Condition | Result |
| --- | --- |
| `prefers-reduced-motion: reduce` | `fallback` — the illustrated 2D journey |
| No WebGL | `fallback` |
| `effectiveType` 2g/3g, or Save-Data | `fallback` |
| ≤2 cores or ≤2 GB device memory | `fallback` |
| ≤4 cores, or a very narrow viewport | `lite` — 3D at lower DPR, no shadows, fewer particles, no LOD swap |
| otherwise | `full` |

The three.js bundle is `lazy()`-imported, so fallback visitors download **none** of
it. Visitors can override the choice in either direction with the switch at the
bottom of the page (stored as `gowatt:tier`).

The reduced-motion path goes beyond disabling CSS transitions: it serves a genuinely
separate screenshot-style journey. Within the 3D path, reduced motion also snaps the
car between scene anchors instead of tweening and disables particles and pulses.

Other measures: `frameloop="demand"` with a governor that draws nothing while the tab
is hidden or once the visitor is past the finale (a render loop running under the
footer is pure battery burn); per-frame reads that never touch React state;
`<Detailed>` LOD on the car; instanced lamp posts; and all textures generated
client-side (road, ground, lamp glow) apart from the car model's own baked textures.

### Bundle reality check

From the current build (gzipped): main app ~111 kB, three.js scene chunk ~249 kB,
CSS ~5 kB — all requested before any 3D asset. The hero heading is the LCP element and
paints before any of that, let alone the car, is fetched.

The car model itself is **not** part of that bundle and is the honest asterisk on the
"~4 MB scene budget" from the original brief: `full` tier requests both
`tesla-model-3.glb` (~2.4 MB) and `tesla-model-3-lite.glb` (~1.2 MB, the far-LOD swap),
`lite` tier requests only the 1.2 MB file. That ~3.6 MB (full tier) is real weight this
build carries that the original all-procedural plan did not — the tradeoff made
explicitly, in exchange for a real car instead of a generic one. `useGLTF.preload()`
kicks off both fetches as soon as the Scene module itself is requested, in parallel
with everything else, rather than waiting for the car to scroll into view.

---

## Navigation

`Chrome.tsx`'s `Header` does four things beyond a static bar of links:

- **Scroll elevation.** Flat/translucent over the hero, opaque with a hairline
  border + shadow once `window.scrollY > 8` — the standard "modern nav" cue that a
  fixed header is now sitting over real content, not empty space.
- **Scrollspy on "Services."** Of the three nav links, only Services is an in-page
  anchor (About/FAQ are separate canvas-free pages, so there's nothing honest to
  "spy" on there) — its underline activates once `scene >= ` the Services scene's
  index, reading the same `scene` value the store already tracks for the progress
  bar. No separate IntersectionObserver needed.
- **A mobile drawer that didn't exist before.** The desktop nav links were simply
  `hidden md:flex` with no fallback — mobile visitors had no way to reach
  Services/About/FAQ except the sticky register CTA. The hamburger button now opens a
  focus-trapped drawer (Escape, overlay-click, and Tab-wrap all handled, the same
  pattern as `RegisterDialog`) with the same links plus the mode/lang toggles and the
  register CTA.
- **An underline that doesn't care about text direction.** `transform: scaleX()` from
  `origin-center` rather than a fixed-edge `::after`, so it looks identical under
  RTL and LTR without a mirrored variant.

---

## Wiring the forms

`lib/submit.ts` is the only place that talks to a backend. Set:

```
VITE_FORMS_ENDPOINT=https://<project>.supabase.co/functions/v1/submit
VITE_TURNSTILE_SITE_KEY=0x...        # optional; renders the widget
```

The endpoint receives `{ form, payload, token }`. Everything that must not live in a
browser belongs there: Supabase/Neon insertion, the Resend/SendGrid bilingual
confirmation email, Turnstile token verification, server-side rate limiting, and CSV
export for the team.

**Until that endpoint is set, submissions are queued in `localStorage` and the UI
says so explicitly.** It never claims a submission was delivered when it wasn't. The
client-side 20-second throttle is a courtesy, not a security control.

---

## Accessibility

- Overlay cards are ordinary HTML with correct heading order — never 3D text. The
  canvas is `aria-hidden` with a single text description, because it only restates
  what the cards already say.
- Charge state pairs every colour with an icon and a text label.
- The register dialog is `aria-modal` with a real focus trap, Escape to close, and
  focus returned to whatever opened it. Failed validation moves focus to the first
  bad field.
- FAQ accordions keep `aria-expanded` truthful, in React and on the static pages.
- Visible focus rings on everything interactive; a skip link to `#main`.
- Progress readouts are real `role="progressbar"` elements with live values.

---

## Known gaps and follow-ups

These are real and deliberately not papered over:

1. **The Tesla Model 3 model has no commercial license on file.** This is the single
   biggest open item in the repository — see "The car model" above. Everything else in
   this list is a polish gap; this one is a legal exposure that a design review cannot
   resolve, only a license (or a reversion to the generic car still sitting in git
   history) can.
2. **`gowatt-logo-white.svg` does not exist.** Night mode uses
   `gowatt-logo-orange.png`, the only dark-safe logo in `brand/logo/`. A full
   white/green two-colour mark would be better. Not a launch blocker.
3. **Google Play badge.** `brand/icon/` has Apple marks but no Play equivalent, so
   the Play button is text-only. Both buttons are non-interactive on purpose — the
   app is not published, and they must not look like working store links.
4. **Membership screenshots are placeholders**, awaiting real app captures. They are
   not mock screenshots, because a fabricated screenshot of an unlaunched app would
   be a false claim.
5. **English text pages.** `/en/` is a real, indexable English page, but About / FAQ
   / Privacy / Terms exist in Arabic only; their `hreflang` points at `/en/`. English
   counterparts are a straightforward addition (copy the four files under `en/` and
   add them to `rollupOptions.input`).
6. **`EVO Chargers.kml`** in the project root is a live feed of *someone else's*
   charger network. It is deliberately unused. The coverage beat is a stylised plate
   with illustrative dots, and the copy says so.
7. **The charging cable's reach is hand-tuned, not measured.** `ChargerPost` in
   `Environment.tsx` was built against the procedural car's exact width; the cable
   length was nudged back to roughly reach the Tesla model's wider body, but nothing
   computes the actual gap between the post and the car's real (bounding-box-derived)
   surface. Close enough to read correctly at a glance, not pixel-exact.
8. **Coverage-scene "first phase vs. under study" governorate split (5 vs. 6) is a
   reasonable illustrative guess** (larger, better-connected governorates first), not
   a decided rollout plan — the copy is careful to say "planned"/"illustrative"
   throughout, but if a real rollout order exists, use it instead.
9. **Privacy and Terms are operational drafts**, accurate about what the site does
   today, but they need review by a qualified lawyer before launch — along with
   company registration and e-wallet licensing, which no amount of front-end work
   addresses.
