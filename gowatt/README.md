# Go Watt — 3D scroll experience

A bilingual (Arabic RTL default / English LTR) pre-launch marketing site for Go Watt,
built as one continuous scroll journey: a generic electric car drives along a winding
road from the hero down to a "battery full" finale, with HTML overlay cards narrating
each beat.

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
    Car.tsx               ← the generic EV, modelled in code
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

## The car

**The car is built procedurally in `Car.tsx`, not loaded from a file.** This is a
deliberate decision on three grounds:

- **Licensing.** The two `.glb` files that came with the project brief are a Tesla
  Model 3 and a BYD Dolphin. Both are trademarked production vehicle designs, and
  using either in commercial marketing carries a double exposure: the vehicle design
  itself, plus the licence on the model file. The brief forbids branded vehicles.
- **Weight.** Those two files are 22 MB and 34 MB. The entire scene budget is ~4 MB.
- **Cost.** Geometry in code downloads as zero bytes, needs no Draco/KTX2 pipeline,
  and has no texture requests.

The silhouette is an original crossover: high beltline, narrower raked greenhouse,
brand-green side accent. Its charge port is amber while charging and green when
complete — and that state is *always* mirrored by a text label plus an icon in the
overlay, never colour alone.

### Swapping in a `.glb` later

If a licensed model is ever commissioned:

1. Compress it first — `gltf-transform optimize in.glb out.glb --texture-compress ktx2`
   — and confirm it lands at 1–2 MB.
2. Put it in `public/models/`, load it with `useGLTF` inside `Car.tsx`, and keep the
   existing `<group ref={spinRef}>` wrapper plus the `gw-wheel`-named wheel groups so
   the finale spin and wheel roll keep working.
3. **Document the commercial licence in writing before shipping.** Do not assume a
   downloadable model is cleared for commercial use.

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
client-side.

### Bundle reality check

From the current build (gzipped): main app ~109 kB, three.js scene chunk ~227 kB,
CSS ~5 kB, and **no 3D asset downloads at all**. The hero heading is the LCP element
and paints before the scene chunk is requested.

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

1. **`gowatt-logo-white.svg` does not exist.** Night mode uses
   `gowatt-logo-orange.png`, the only dark-safe logo in `brand/logo/`. A full
   white/green two-colour mark would be better. Not a launch blocker.
2. **Google Play badge.** `brand/icon/` has Apple marks but no Play equivalent, so
   the Play button is text-only. Both buttons are non-interactive on purpose — the
   app is not published, and they must not look like working store links.
3. **Membership screenshots are placeholders**, awaiting real app captures. They are
   not mock screenshots, because a fabricated screenshot of an unlaunched app would
   be a false claim.
4. **English text pages.** `/en/` is a real, indexable English page, but About / FAQ
   / Privacy / Terms exist in Arabic only; their `hreflang` points at `/en/`. English
   counterparts are a straightforward addition (copy the four files under `en/` and
   add them to `rollupOptions.input`).
5. **`EVO Chargers.kml`** in the project root is a live feed of *someone else's*
   charger network. It is deliberately unused. The coverage beat is a stylised plate
   with illustrative dots, and the copy says so.
6. **Privacy and Terms are operational drafts**, accurate about what the site does
   today, but they need review by a qualified lawyer before launch — along with
   company registration and e-wallet licensing, which no amount of front-end work
   addresses.
