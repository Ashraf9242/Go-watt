import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Detailed, useGLTF } from '@react-three/drei'
import { motion, useJourney } from '../store/journey'
import { localProgress } from '../journey/scenes'
import { travelProgress } from './road'

/**
 * TESLA MODEL 3 — real, licensed-status-unconfirmed asset, used at the
 * project owner's explicit direction after being told the risk in plain
 * terms and choosing to proceed anyway (see README "The car model" for the
 * full record). This file previously held an original, license-safe
 * procedural crossover with zero download weight; that code is gone from
 * HEAD but still in git history if this ever needs to be reverted.
 *
 * Source: `tesla_2018_model_3.glb` (project root), a Sketchfab export with no
 * accompanying license documentation in this repository. Compressed here via
 * gltf-transform (meshopt geometry + WebP textures, node names preserved) —
 * see `gowatt/README.md` for the exact pipeline and the honest size numbers.
 * Never assume this clears the asset for commercial use; that check still
 * has to happen before this ships anywhere real.
 */

const HERO_URL = '/models/tesla-model-3.glb'
const LITE_URL = '/models/tesla-model-3-lite.glb'

useGLTF.preload(HERO_URL, false, true)
useGLTF.preload(LITE_URL, false, true)

const AMBER = '#fbb03b'
const COMPLETE = '#3fae6a'

/**
 * The source file already bakes its own axis correction into the root
 * "Tesla Model 3" node (a -90°-about-X rotation plus a ×100 unit scale, both
 * standard artifacts of a Sketchfab/Blender export) — glTF loaders always
 * apply node transforms, so that correction lands automatically and needs no
 * help here. An early version of this file also applied its own hand-derived
 * axis-fix on top, which double-rotated the model into an unrecognisable
 * heap; measuring the model's real bounding box (not raw node translations,
 * which ignore ancestor scale/rotation) is what exposed that. Any remaining
 * yaw to make "front" line up with this rig's +Z convention is a plain
 * Y rotation, verified empirically below — never touch X/Z here again
 * without re-checking against a screenshot.
 */
const AXIS_FIX: [number, number, number] = [0, Math.PI, 0]

/** Matches the wheel-only node names confirmed by inspecting the glb's scene
 * graph directly ("wheels", "wheels.001", ...) — not a guess. */
const WHEEL_NAME = /^wheels(\.\d+)?$/i

type Detail = 'hero' | 'lite'

/**
 * One loaded, grounded, correctly-scaled copy of the model.
 *
 * Scale and ground offset are computed from the model's own bounding box at
 * mount time rather than hand-typed constants — robust against the exact
 * numbers shifting if the compression pipeline is ever re-run with different
 * settings.
 */
function TeslaVariant({
  detail,
  portRef,
  onWheels,
}: {
  detail: Detail
  portRef: React.MutableRefObject<THREE.MeshStandardMaterial | null>
  onWheels: (nodes: THREE.Object3D[]) => void
}) {
  const url = detail === 'hero' ? HERO_URL : LITE_URL
  const gltf = useGLTF(url, false, true)
  const wrapper = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)

  // Cloned once per variant instance: mutating a shared cached GLTF scene
  // graph directly would bleed across every consumer of that cache (and
  // across hot reloads). three.js's clone(true) duplicates the node graph
  // while still sharing geometries/materials, which is exactly what's needed
  // here — nothing below mutates a shared material, only adds a sibling.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene])

  useEffect(() => {
    const wrap = wrapper.current
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())

    // Sized to match this scene's road/lamp/camera scale — not the real
    // car's literal dimensions. Targets roughly the same footprint the
    // original procedural crossover used (~2m wide, ~4.3m long).
    const targetLength = 4.3
    const scale = size.z > 0.01 ? targetLength / size.z : 1

    if (inner.current) inner.current.scale.setScalar(scale)
    if (wrap) {
      // The asset's own root node isn't centred on its local origin (the
      // Sketchfab rig it ships with was framed for a viewer, not a driving
      // rig), so grounding on Y alone left the car sitting off to one side of
      // the lane. Re-centre X and Z here too, using the same real bounding
      // box, so the wrapper's origin is the car's true centre before the
      // outer CarRig ever positions it on the road.
      wrap.updateMatrixWorld(true)
      const groundedBox = new THREE.Box3().setFromObject(wrap)
      wrap.position.y -= groundedBox.min.y
      wrap.position.x -= (groundedBox.min.x + groundedBox.max.x) / 2
      wrap.position.z -= (groundedBox.min.z + groundedBox.max.z) / 2
    }

    const wheels: THREE.Object3D[] = []
    scene.traverse((o) => {
      if (WHEEL_NAME.test(o.name)) wheels.push(o)
    })
    onWheels(wheels)

    // A small, fully self-controlled glow near the rear-left quarter panel —
    // deliberately a separate decal rather than hunting for and retinting one
    // of the model's own ~40 materials. That keeps the "charging" indicator
    // robust to exactly which real Tesla mesh happens to be loaded, the same
    // way the finale spin and charge-port state don't care what's inside.
    if (portRef && wrap) {
      wrap.updateMatrixWorld(true)
      const b = new THREE.Box3().setFromObject(wrap)
      const port = wrap.userData.portMesh as THREE.Mesh | undefined
      if (port) {
        port.position.set(
          b.min.x + (b.max.x - b.min.x) * 0.06,
          b.min.y + (b.max.y - b.min.y) * 0.42,
          b.min.z + (b.max.z - b.min.z) * 0.32,
        )
      }
    }
    // Runs once per loaded variant; the model's own geometry never changes
    // after mount, only the ref-driven materials/rotations below do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene])

  return (
    <group ref={wrapper}>
      <group ref={inner} rotation={AXIS_FIX}>
        <primitive object={scene} />
      </group>
      {/* Charge-port indicator decal — position set imperatively above once
          the model's real bounding box is known. */}
      <mesh
        ref={(m) => {
          if (m && wrapper.current) wrapper.current.userData.portMesh = m
        }}
        rotation={[0, Math.PI / 2, 0]}
      >
        <circleGeometry args={[0.14, detail === 'hero' ? 20 : 8]} />
        <meshStandardMaterial
          ref={portRef}
          color="#2a2f2c"
          emissive={AMBER}
          emissiveIntensity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export function Car() {
  const tier = useJourney((s) => s.tier)
  const reduced = useJourney((s) => s.reducedMotion)

  const spinRef = useRef<THREE.Group>(null)
  const wheelSets = useRef<THREE.Object3D[][]>([])
  const portHero = useRef<THREE.MeshStandardMaterial | null>(null)
  const portLite = useRef<THREE.MeshStandardMaterial | null>(null)
  const lastProgress = useRef(0)

  const amber = useMemo(() => new THREE.Color(AMBER), [])
  const green = useMemo(() => new THREE.Color(COMPLETE), [])

  useFrame((_, delta) => {
    const p = motion.progress

    // Wheel roll follows distance actually travelled — not clock time and not
    // raw scroll — so the wheels stop when the visitor stops scrolling, and
    // also stop while the car is parked at the charger even though scroll
    // progress keeps climbing through the charging beat.
    const travel = travelProgress(p)
    const travelled = Math.abs(travel - lastProgress.current)
    lastProgress.current = travel
    if (!reduced) {
      for (const wheels of wheelSets.current) {
        for (const w of wheels) w.rotation.x -= travelled * 420
      }
    }

    // Charging glow: amber during the charge beat, green once complete.
    const chargeLocal = localProgress('charge', p)
    const finaleLocal = localProgress('finale', p)
    const pulse = reduced ? 1 : 0.72 + Math.sin(performance.now() * 0.006) * 0.28
    const charging = chargeLocal > 0.05 && chargeLocal < 1 && finaleLocal === 0
    const intensity = finaleLocal > 0.15 ? 2.4 : charging ? 1.6 * pulse : chargeLocal >= 1 ? 1.1 : 0

    for (const ref of [portHero, portLite]) {
      const mat = ref.current
      if (!mat) continue
      mat.emissiveIntensity = intensity
      mat.emissive.copy(finaleLocal > 0.15 ? green : amber)
    }

    // Finale: one full 360° spin, eased, then held.
    if (spinRef.current) {
      const target = finaleLocal > 0.2 ? Math.PI * 2 : 0
      if (reduced) {
        spinRef.current.rotation.y = target
      } else {
        spinRef.current.rotation.y = THREE.MathUtils.damp(
          spinRef.current.rotation.y,
          target,
          3.2,
          delta,
        )
      }
    }
  })

  const registerWheels = (slot: number) => (nodes: THREE.Object3D[]) => {
    wheelSets.current[slot] = nodes
  }

  return (
    <group ref={spinRef}>
      {tier === 'lite' ? (
        <TeslaVariant detail="lite" portRef={portLite} onWheels={registerWheels(0)} />
      ) : (
        // LOD: the full-detail model swaps for the lighter one once the car is
        // small on screen (coverage zoom-out, FAQ background).
        <Detailed distances={[0, 50]}>
          <TeslaVariant detail="hero" portRef={portHero} onWheels={registerWheels(0)} />
          <TeslaVariant detail="lite" portRef={portLite} onWheels={registerWheels(1)} />
        </Detailed>
      )}
    </group>
  )
}
