import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Car } from './Car'
import { headingAt, pointAt, tangentAt } from './road'
import { motion, useJourney } from '../store/journey'
import { SCENES, clamp01, sceneIndexAt, type SceneDef } from '../journey/scenes'

/**
 * CAR RIG + CAMERA RIG
 *
 * Both read `motion.progress` directly inside useFrame — no React state is
 * involved in per-frame motion, so scrolling never triggers a re-render.
 *
 * The car's position comes from curve.getPointAt(progress) and its heading
 * from curve.getTangentAt(progress), which is what makes it bank into the
 * zigzag instead of sliding sideways through the turns.
 */

type CameraProfile = { back: number; height: number; lookAhead: number; fov: number }

const PROFILES: Record<SceneDef['camera'], CameraProfile> = {
  follow: { back: 14, height: 5.2, lookAhead: 7, fov: 40 },
  wide: { back: 16, height: 5.6, lookAhead: 3, fov: 43 },
  'orbit-out': { back: 30, height: 34, lookAhead: 0, fov: 52 },
  calm: { back: 19, height: 7.2, lookAhead: 10, fov: 38 },
  finale: { back: 15, height: 5.0, lookAhead: 2, fov: 42 },
}

/**
 * How far to push the car off screen-centre, in world units.
 *
 * The overlay cards occupy the text-start side of the viewport, so the car has
 * to sit on the other one — otherwise the cards cover the very thing they are
 * describing. Aiming the camera to the car's right makes the car appear on
 * screen-left, which is what an RTL layout (cards on the right) needs; LTR
 * mirrors it.
 */
const FRAME_SHIFT = 4.5

export function CarRig() {
  const group = useRef<THREE.Group>(null)
  const reduced = useJourney((s) => s.reducedMotion)
  const pos = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    if (!group.current) return
    const p = motion.progress

    pointAt(p, pos)
    const heading = headingAt(p)

    if (reduced) {
      // Reduced motion: snap to the current scene's anchor point instead of
      // tweening continuously along the curve.
      const i = sceneIndexAt(p)
      const anchor = (SCENES[i].start + SCENES[i].end) / 2
      pointAt(anchor, pos)
      group.current.position.copy(pos)
      group.current.rotation.y = headingAt(anchor)
      return
    }

    group.current.position.lerp(pos, 1 - Math.pow(0.001, delta))
    // Shortest-arc damping so the car never spins the long way round.
    const current = group.current.rotation.y
    let diff = heading - current
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    group.current.rotation.y = current + diff * (1 - Math.pow(0.0025, delta))
  })

  return (
    <group ref={group}>
      <Car />
    </group>
  )
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const reduced = useJourney((s) => s.reducedMotion)
  const lang = useJourney((s) => s.lang)

  // RTL puts the cards on the right, so the car belongs on the left, and the
  // whole composition mirrors when the visitor switches to English.
  const dir = lang === 'ar' ? 1 : -1

  const target = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  const carPos = useMemo(() => new THREE.Vector3(), [])
  const aheadPos = useMemo(() => new THREE.Vector3(), [])
  const lookAt = useMemo(() => new THREE.Vector3(), [])
  const forward = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const p = motion.progress
    const i = sceneIndexAt(p)
    const scene = SCENES[i]

    // Blend between this scene's camera profile and the next one across the
    // last 25% of the scene, so the zoom-out for Coverage eases in.
    const local = clamp01((p - scene.start) / (scene.end - scene.start))
    const next = SCENES[Math.min(i + 1, SCENES.length - 1)]
    const blend = local > 0.75 ? (local - 0.75) / 0.25 : 0
    const a = PROFILES[scene.camera]
    const b = PROFILES[next.camera]
    const prof: CameraProfile = {
      back: THREE.MathUtils.lerp(a.back, b.back, blend),
      height: THREE.MathUtils.lerp(a.height, b.height, blend),
      lookAhead: THREE.MathUtils.lerp(a.lookAhead, b.lookAhead, blend),
      fov: THREE.MathUtils.lerp(a.fov, b.fov, blend),
    }

    pointAt(p, carPos)
    tangentAt(p, forward)
    // Right-hand side of the direction of travel: forward × up.
    right.set(-forward.z, 0, forward.x).normalize()

    // Behind the car along its own heading, raised, and nudged sideways so the
    // view reads as three-quarter rather than dead-astern.
    desired
      .copy(carPos)
      .addScaledVector(forward, -prof.back)
      .addScaledVector(right, shift * 0.3)
    desired.y = carPos.y + prof.height

    pointAt(Math.min(1, p + 0.02), aheadPos)
    lookAt.copy(carPos).lerp(aheadPos, prof.lookAhead / 12)
    // Aiming off to one side is what moves the car out from behind the cards.
    lookAt.addScaledVector(right, shift)
    lookAt.y += 1.1

    if (reduced) {
      camera.position.copy(desired)
      target.copy(lookAt)
    } else {
      camera.position.lerp(desired, 1 - Math.pow(0.0015, delta))
      target.lerp(lookAt, 1 - Math.pow(0.002, delta))
    }

    camera.lookAt(target)
    if (Math.abs(camera.fov - prof.fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, prof.fov, 3, delta)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
