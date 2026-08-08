/**
 * Path & timeline verification. Run with `npm run verify`.
 *
 * Editing the road's control points is the most common change anyone will make
 * to this project, and it is easy to make a change that looks fine in a still
 * frame but produces a corner no car could physically take — the car then
 * visibly pivots on the spot instead of turning. This script catches that,
 * plus timeline gaps and prop placement, without needing a browser.
 */
import * as THREE from 'three'
import { SCENES, TOTAL_VH, localProgress, sceneIndexAt } from '../src/journey/scenes'
import {
  CHARGER_ANCHOR,
  buildRoadGeometry,
  headingAt,
  lampTransforms,
  pointAt,
  roadCurve,
  sceneMid,
  tangentAt,
  travelProgress,
} from '../src/three/road'

let failures = 0
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'ok   ' : 'FAIL '} ${name}${detail ? `  — ${detail}` : ''}`)
}

/* ------------------------------------------------------------- timeline */

check('scene count is 14', SCENES.length === 14)
check('timeline starts at 0', Math.abs(SCENES[0].start) < 1e-9)
check('timeline ends at 1', Math.abs(SCENES[SCENES.length - 1].end - 1) < 1e-9)
check(
  'no gaps or overlaps between scenes',
  SCENES.every((s, i) => i === 0 || Math.abs(s.start - SCENES[i - 1].end) < 1e-9),
)
check('scroll track height is sane', TOTAL_VH > 1200 && TOTAL_VH < 2600, `${TOTAL_VH}svh`)
check('scene lookup at both ends', sceneIndexAt(0) === 0 && sceneIndexAt(1) === SCENES.length - 1)
check(
  'per-scene progress clamps and centres',
  localProgress('charge', 0) === 0 &&
    localProgress('charge', 1) === 1 &&
    Math.abs(localProgress('charge', sceneMid('charge')) - 0.5) < 1e-6,
)

/* ------------------------------------------------------------- the curve */

const N = 400
const samples = Array.from({ length: N + 1 }, (_, i) => pointAt(i / N, new THREE.Vector3()))

check(
  'road only ever advances forward',
  samples.every((p, i) => i === 0 || p.z <= samples[i - 1].z + 1e-6),
)

const xs = samples.map((p) => p.x)
check(
  'road zigzags across both sides',
  Math.max(...xs) > 3 && Math.min(...xs) < -3,
  `x from ${Math.min(...xs).toFixed(1)} to ${Math.max(...xs).toFixed(1)}`,
)

// Counts direction reversals rather than zero crossings: the road is built from
// wide S-curves, so it can swing hard without crossing the centre often.
let reversals = 0
for (let i = 2; i <= N; i++) {
  const prev = xs[i - 1] - xs[i - 2]
  const curr = xs[i] - xs[i - 1]
  if (Math.abs(prev) > 1e-4 && Math.abs(curr) > 1e-4 && Math.sign(prev) !== Math.sign(curr)) {
    reversals++
  }
}
check('road swings enough to read as a journey', reversals >= 4, `${reversals} direction changes`)
check(
  'lateral swing is visible against the road width',
  Math.max(...xs.map(Math.abs)) > 6,
  `max ${Math.max(...xs.map(Math.abs)).toFixed(1)} units off centre`,
)

const ys = samples.map((p) => p.y)
check('road stays near ground level', Math.max(...ys) < 2 && Math.min(...ys) > -0.5)

// Turning radius: r = arcLength / headingChange. Anything under ~16 units is a
// hairpin at this scale (the car is 4.3 units long).
const MIN_RADIUS = 16
let tightest = Infinity
let tightestAt = 0
for (let i = 1; i <= N; i++) {
  let dTheta = headingAt(i / N) - headingAt((i - 1) / N)
  while (dTheta > Math.PI) dTheta -= Math.PI * 2
  while (dTheta < -Math.PI) dTheta += Math.PI * 2
  const arc = samples[i].distanceTo(samples[i - 1])
  if (Math.abs(dTheta) > 1e-6) {
    const r = arc / Math.abs(dTheta)
    if (r < tightest) {
      tightest = r
      tightestAt = i / N
    }
  }
}
check(
  `no corner tighter than ${MIN_RADIUS} units`,
  tightest >= MIN_RADIUS,
  `tightest radius ${tightest.toFixed(1)} at progress ${tightestAt.toFixed(3)}`,
)

check('tangents are normalised', Math.abs(tangentAt(0.5, new THREE.Vector3()).length() - 1) < 1e-6)

// The car must actually be stationary at the charger while it charges and pays,
// and must resume afterwards.
const atCharger = pointAt(sceneMid('charge'), new THREE.Vector3())
const duringCharge = pointAt(sceneMid('charge') + 0.02, new THREE.Vector3())
const atPayEnd = pointAt(SCENES.find((s) => s.id === 'pay')!.end, new THREE.Vector3())
const afterPay = pointAt(SCENES.find((s) => s.id === 'pay')!.end + 0.05, new THREE.Vector3())
check('car holds still while charging', duringCharge.distanceTo(atCharger) < 1e-6)
check('car is still at the post when payment ends', atPayEnd.distanceTo(atCharger) < 1e-6)
check('car resumes after payment', afterPay.distanceTo(atCharger) > 5, `moved ${afterPay.distanceTo(atCharger).toFixed(1)} units`)
check('travel mapping still ends at the finish', Math.abs(travelProgress(1) - 1) < 1e-9)

/* ------------------------------------------------------- prop placement */

const carAtCharge = pointAt(sceneMid('charge'), new THREE.Vector3())
const chargerOffset = Math.hypot(
  CHARGER_ANCHOR.x - carAtCharge.x,
  CHARGER_ANCHOR.z - carAtCharge.z,
)
check(
  'charger sits on the shoulder, within cable reach',
  chargerOffset > 4 && chargerOffset < 7,
  `${chargerOffset.toFixed(2)} units from the car`,
)

const lamps = lampTransforms(26)
check('lamp count matches request', lamps.length === 26)
check(
  'lamps alternate sides of the road',
  lamps.every((l, i) => l.side === (i % 2 === 0 ? 1 : -1)),
)
// Measured against the same curve parameter the lamp was placed from.
const lampOffsets = lamps.map((l, i) => {
  const p = roadCurve.getPointAt((i + 0.5) / lamps.length, new THREE.Vector3())
  return Math.hypot(l.position.x - p.x, l.position.z - p.z)
})
check(
  'lamp posts clear the tarmac without floating away',
  lampOffsets.every((o) => o > 5 && o < 9),
  `offsets ${Math.min(...lampOffsets).toFixed(2)}–${Math.max(...lampOffsets).toFixed(2)}`,
)
// A lamp head offset along `inward` must end up closer to the road than its
// post, or the light pools fall on the sand instead of the tarmac.
const headOffsets = lamps.map((l, i) => {
  const p = roadCurve.getPointAt((i + 0.5) / lamps.length, new THREE.Vector3())
  const head = l.position.clone().addScaledVector(l.inward, 1.9)
  return Math.hypot(head.x - p.x, head.z - p.z)
})
check(
  'lamp heads reach in over the road',
  headOffsets.every((h, i) => h < lampOffsets[i] - 1.5),
  `heads at ${Math.min(...headOffsets).toFixed(2)}–${Math.max(...headOffsets).toFixed(2)}`,
)

/* ---------------------------------------------------------- road geometry */

const geo = buildRoadGeometry(300, 4.2)
const pos = geo.getAttribute('position')
check('road ribbon vertex count', pos.count === 602, `${pos.count} vertices`)
check('road ribbon is indexed', geo.getIndex()?.count === 300 * 6)
check(
  'no NaN vertices',
  !Array.from({ length: pos.count }).some(
    (_, i) => !Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getZ(i)),
  ),
)

// The road is a single-sided ribbon seen from above: if the winding is
// reversed, every normal points at the ground and the road renders as
// nothing at all — invisible, with no error anywhere.
const normals = geo.getAttribute('normal')
let upward = 0
for (let i = 0; i < normals.count; i++) if (normals.getY(i) > 0.9) upward++
check(
  'road normals face up (winding is correct)',
  upward === normals.count,
  `${upward}/${normals.count} vertices facing up`,
)

console.log(failures === 0 ? '\nAll path checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
