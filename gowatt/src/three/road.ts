import * as THREE from 'three'
import { SCENES } from '../journey/scenes'

/**
 * ROAD PATH
 * ---------
 * The winding road is never hand-modelled. Control points are declared here
 * and fed to a CatmullRomCurve3, so re-shaping the journey means editing the
 * numbers below — nothing needs to be re-exported from Blender.
 *
 * Axis convention: X zigzags left/right, Z runs "forward" (the direction of
 * travel), Y stays near ground level with gentle rises. The camera looks down
 * -Z, so scroll progress maps to distance along the curve.
 */

/**
 * One control point per journey beat, plus a lead-in and a run-out.
 *
 * Amplitudes and spacing are chosen so no corner is tighter than a real car
 * could take: the check in `verify:path` fails the build below a ~16-unit
 * turning radius, and the car itself is 4.3 units long. Swinging harder than
 * this reads as a hairpin and the car visibly pivots instead of turning.
 */
const CONTROL_POINTS: [number, number, number][] = [
  [0, 0, 10], // lead-in behind the hero
  [0, 0, 0], // 1 hero — car at rest, centred
  [-5, 0, -26], // 2 login — easing into the first left sweep
  [-8, 0, -52], // 3 profile — apex of the left sweep
  [-5, 0, -78], // 4 find station — coming back
  [0, 0.4, -104], // 5 book slot — straightening for the approach
  [0, 0.4, -128], // 6 charge — deliberately straight at the charger
  [0, 0.2, -146], // 7 payment — still at the post
  [5, 0, -172], // 8a services: rescue van — sweeping right
  [8, 0, -200], // 8b services: V2V — apex right
  [5, 0.5, -228], // 8c services: ride
  [0, 0.5, -254], // 8d services: home sharing
  [0, 0.8, -280], // 9 coverage — centred and raised for the zoom-out
  [-5, 0.3, -306], // 10 points — final left sweep
  [-8, 0.2, -330], // 11 download — apex left
  [-5, 0, -352], // 12 about — settling
  [0, 0, -372], // 13 FAQ — straight, low visual competition with the text
  [0, 0, -392], // 14 finale
  [0, 0, -408], // run-out
]

export const roadCurve = new THREE.CatmullRomCurve3(
  CONTROL_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  false,
  'catmullrom',
  0.35,
)

/**
 * The curve includes a lead-in and a run-out that the story never visits, so
 * scroll progress 0→1 is remapped into the usable middle span.
 */
const T_START = 1 / (CONTROL_POINTS.length - 1)
const T_END = (CONTROL_POINTS.length - 2) / (CONTROL_POINTS.length - 1)

export function sceneRange(id: (typeof SCENES)[number]['id']) {
  const found = SCENES.find((s) => s.id === id)
  if (!found) throw new Error(`Unknown scene: ${id}`)
  return found
}

export function sceneMid(id: Parameters<typeof sceneRange>[0]): number {
  const r = sceneRange(id)
  return (r.start + r.end) / 2
}

/**
 * THE CHARGING STOP
 *
 * The car has to *arrive at the charger and stop* — it cannot keep rolling past
 * the post while the cable is plugged in and the percentage climbs. So travel
 * along the curve pauses from the moment the car reaches the charger until the
 * payment beat ends, and then resumes over the remaining scroll.
 *
 * This lives inside the curve mapping rather than in the car component on
 * purpose: the camera, the charger, the service props and the coverage plate all
 * position themselves through `pointAt`, so they stay in agreement with the car
 * automatically. Putting the hold in the car alone would slide everything else
 * out of alignment.
 */
const HOLD_START = sceneMid('charge')
const HOLD_END = sceneRange('pay').end

export function travelProgress(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  if (p <= HOLD_START) return p
  if (p <= HOLD_END) return HOLD_START
  return HOLD_START + ((p - HOLD_END) * (1 - HOLD_START)) / (1 - HOLD_END)
}

export function curveT(progress: number): number {
  return T_START + (T_END - T_START) * travelProgress(progress)
}

const _pos = new THREE.Vector3()
const _tan = new THREE.Vector3()

export function pointAt(progress: number, out = _pos): THREE.Vector3 {
  return roadCurve.getPointAt(curveT(progress), out)
}

export function tangentAt(progress: number, out = _tan): THREE.Vector3 {
  return roadCurve.getTangentAt(curveT(progress), out).normalize()
}

/** Heading (Y rotation) that keeps the car pointing along its direction of travel. */
export function headingAt(progress: number): number {
  const t = tangentAt(progress, new THREE.Vector3())
  return Math.atan2(t.x, t.z)
}

/** World position of the charger post — scene 6/7 anchor. */
export const CHARGER_ANCHOR = (() => {
  const p = pointAt(sceneMid('charge'), new THREE.Vector3())
  const t = tangentAt(sceneMid('charge'), new THREE.Vector3())
  // Sit the post on the right-hand shoulder relative to travel direction.
  const side = new THREE.Vector3(t.z, 0, -t.x).normalize().multiplyScalar(5.4)
  return p.clone().add(side)
})()

/**
 * ROAD GEOMETRY
 * -------------
 * A ribbon extruded along the curve: two triangles per segment, UVs stretched
 * along V so the asphalt and the dashed centre line can both be drawn in the
 * shader without a texture download.
 */
export function buildRoadGeometry(
  segments = 900,
  halfWidth = 4.2,
): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const p = new THREE.Vector3()
  const t = new THREE.Vector3()
  const side = new THREE.Vector3()

  for (let i = 0; i <= segments; i++) {
    const u = i / segments
    roadCurve.getPointAt(u, p)
    roadCurve.getTangentAt(u, t).normalize()
    side.set(t.z, 0, -t.x).normalize().multiplyScalar(halfWidth)

    positions.push(p.x - side.x, p.y + 0.01, p.z - side.z)
    positions.push(p.x + side.x, p.y + 0.01, p.z + side.z)
    uvs.push(0, u * segments * 0.06)
    uvs.push(1, u * segments * 0.06)

    if (i < segments) {
      // Winding matters: the opposite order gives these triangles a -Y normal,
      // which makes the whole road invisible from above with FrontSide
      // materials. `verify:path` asserts the normals point up.
      const a = i * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export type LampTransform = {
  /** Base of the post, on one shoulder of the road. */
  position: THREE.Vector3
  /** Unit vector from the post toward the centre of the road. */
  inward: THREE.Vector3
  /** Y rotation that points a +Z-aligned arm at the road. */
  rotationY: number
  side: 1 | -1
}

/**
 * Evenly spaced lamp-post transforms, alternating shoulders.
 *
 * `inward` exists so the arm, lamp head, PointLight and light pool can all be
 * offset out over the tarmac — a head sitting straight on top of the pole
 * lights the sand instead of the road.
 */
export const LAMP_OFFSET = 7.2

export function lampTransforms(count = 26): LampTransform[] {
  const out: LampTransform[] = []
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count
    const p = roadCurve.getPointAt(u, new THREE.Vector3())
    const t = roadCurve.getTangentAt(u, new THREE.Vector3()).normalize()
    const side: 1 | -1 = i % 2 === 0 ? 1 : -1
    const lateral = new THREE.Vector3(t.z, 0, -t.x).normalize()
    const inward = lateral.clone().multiplyScalar(-side)
    out.push({
      position: p.clone().addScaledVector(lateral, LAMP_OFFSET * side),
      inward,
      rotationY: Math.atan2(inward.x, inward.z),
      side,
    })
  }
  return out
}
