import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { buildRoadGeometry, lampTransforms, pointAt, sceneMid, tangentAt } from './road'
import { makeGlowTexture, makeGroundTexture, makeRoadTexture } from './textures'
import { motion, useJourney } from '../store/journey'
import { localProgress } from '../journey/scenes'

const AMBER = '#fbb03b'
const GREEN = '#28844c'
const LAMP_GLOW = '#ffefc7'

/* ------------------------------------------------------------------ road */

export function Road() {
  const geometry = useMemo(() => buildRoadGeometry(), [])
  const texture = useMemo(() => makeRoadTexture(), [])
  const ground = useMemo(() => makeGroundTexture(), [])
  const mode = useJourney((s) => s.mode)
  const lineRef = useRef<THREE.MeshStandardMaterial>(null)

  // The amber centre line stays amber in both modes; only its glow lifts at
  // night, and it flashes green for the finale.
  useFrame(() => {
    const mat = lineRef.current
    if (!mat) return
    const finale = localProgress('finale', motion.progress)
    mat.emissiveIntensity = (mode === 'night' ? 0.55 : 0.18) + finale * 0.9
    mat.emissive.set(finale > 0.2 ? GREEN : AMBER)
  })

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          map={texture}
          roughness={0.92}
          metalness={0.05}
          emissiveMap={texture}
          emissive={AMBER}
          emissiveIntensity={0.18}
          ref={lineRef}
        />
      </mesh>

      {/* Ground plane. Large enough to read as desert on either shoulder. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -200]} receiveShadow>
        <planeGeometry args={[420, 700]} />
        <meshStandardMaterial map={ground} roughness={1} color={mode === 'night' ? '#3a4a3c' : '#ffffff'} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------- street lighting */

/**
 * One low-poly lamp post, instanced along both shoulders.
 *
 * PointLights are the expensive part, so only the handful nearest the car are
 * ever lit — and all of them sit at intensity 0 in day mode, which is what
 * makes the night toggle read as "the lights just came on".
 */
export function Streetlights({ count = 26 }: { count?: number }) {
  const mode = useJourney((s) => s.mode)
  const tier = useJourney((s) => s.tier)
  const transforms = useMemo(() => lampTransforms(count), [count])
  const glow = useMemo(() => makeGlowTexture(), [])

  const poles = useRef<THREE.InstancedMesh>(null)
  const arms = useRef<THREE.InstancedMesh>(null)
  const heads = useRef<THREE.InstancedMesh>(null)

  const LIVE_LIGHTS = tier === 'lite' ? 2 : 4
  const lights = useRef<(THREE.PointLight | null)[]>([])
  const sprites = useRef<(THREE.Sprite | null)[]>([])

  // How far the arm reaches out over the tarmac from the top of the post.
  const REACH = 1.9
  const POST_HEIGHT = 5.6

  useLayoutEffect(() => {
    // Instance matrices are written once; lamps never move.
    const dummy = new THREE.Object3D()
    const write = (mesh: THREE.InstancedMesh | null, y: number, reach: number) => {
      if (!mesh) return
      transforms.forEach((t, i) => {
        dummy.position.copy(t.position).addScaledVector(t.inward, reach)
        dummy.position.y = y
        dummy.rotation.set(0, t.rotationY, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    write(poles.current, POST_HEIGHT / 2, 0)
    write(arms.current, POST_HEIGHT - 0.1, REACH / 2)
    write(heads.current, POST_HEIGHT - 0.22, REACH)
  }, [transforms])

  // Move the small pool of real lights to whichever lamps are nearest the car.
  useFrame((_, delta) => {
    const carPos = pointAt(motion.progress, new THREE.Vector3())
    const ranked = transforms
      .map((t, i) => ({ i, d: t.position.distanceToSquared(carPos) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, LIVE_LIGHTS)

    const targetIntensity = mode === 'night' ? 26 : 0

    ranked.forEach((r, slot) => {
      const light = lights.current[slot]
      const sprite = sprites.current[slot]
      const t = transforms[r.i]
      // Lit from the lamp head, out over the road — not from the post itself.
      const head = t.position.clone().addScaledVector(t.inward, REACH)
      if (light) {
        light.position.set(head.x, POST_HEIGHT - 0.4, head.z)
        light.intensity = THREE.MathUtils.damp(light.intensity, targetIntensity, 4, delta)
      }
      if (sprite) {
        sprite.position.set(head.x, 0.06, head.z)
        const m = sprite.material as THREE.SpriteMaterial
        m.opacity = THREE.MathUtils.damp(m.opacity, mode === 'night' ? 0.5 : 0, 4, delta)
      }
    })
  })

  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, POST_HEIGHT, 7]} />
        <meshStandardMaterial color="#4a5450" roughness={0.7} metalness={0.4} />
      </instancedMesh>

      <instancedMesh ref={arms} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.09, 0.09, REACH]} />
        <meshStandardMaterial color="#4a5450" roughness={0.7} metalness={0.4} />
      </instancedMesh>

      <instancedMesh ref={heads} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.38, 0.14, 0.8]} />
        <meshStandardMaterial
          color="#d8d2c4"
          emissive={LAMP_GLOW}
          emissiveIntensity={mode === 'night' ? 2.6 : 0}
          toneMapped={false}
        />
      </instancedMesh>

      {Array.from({ length: LIVE_LIGHTS }).map((_, i) => (
        <pointLight
          key={`lamp-light-${i}`}
          ref={(el) => {
            lights.current[i] = el
          }}
          color={LAMP_GLOW}
          intensity={0}
          distance={17}
          decay={2}
        />
      ))}

      {/* Light pools on the tarmac — cheaper and softer than shadow-casting. */}
      {Array.from({ length: LIVE_LIGHTS }).map((_, i) => (
        <sprite
          key={`lamp-pool-${i}`}
          ref={(el) => {
            sprites.current[i] = el
          }}
          scale={[11, 11, 1]}
        >
          <spriteMaterial
            map={glow}
            color={LAMP_GLOW}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  )
}

/* ------------------------------------------------------- charger station */

export function ChargerPost() {
  const lang = useJourney((s) => s.lang)
  const anchor = useMemo(() => pointAt(sceneMid('charge'), new THREE.Vector3()), [])
  const heading = useMemo(() => {
    const t = tangentAt(sceneMid('charge'), new THREE.Vector3())
    return Math.atan2(t.x, t.z)
  }, [])
  const screen = useRef<THREE.MeshStandardMaterial>(null)
  const cable = useRef<THREE.Group>(null)

  /**
   * The camera pushes the car to the side of the screen opposite the overlay
   * cards, so the charger has to stand on the shoulder *between* the car and
   * the cards — otherwise it is cropped off the edge exactly when the visitor
   * is reading about it. That side flips with the text direction, the same way
   * the camera framing does.
   */
  const sign = lang === 'ar' ? -1 : 1

  const side = useMemo(() => {
    const t = tangentAt(sceneMid('charge'), new THREE.Vector3())
    return new THREE.Vector3(t.z, 0, -t.x).normalize().multiplyScalar(5.2 * sign)
  }, [sign])

  useFrame(() => {
    const local = localProgress('charge', motion.progress)
    const finale = localProgress('finale', motion.progress)
    if (screen.current) {
      screen.current.emissiveIntensity = local > 0.02 ? 1.9 : 0.7
      screen.current.emissive.set(finale > 0.2 || local >= 1 ? GREEN : AMBER)
    }
    // The cable extends toward the car as the connection is made.
    if (cable.current) {
      const connect = THREE.MathUtils.clamp(local / 0.18, 0, 1)
      cable.current.scale.z = 0.001 + connect
      cable.current.visible = connect > 0.02
    }
  })

  return (
    <group position={[anchor.x + side.x, 0, anchor.z + side.z]} rotation={[0, heading, 0]}>
      {/* Concrete pad. Kept light enough not to be mistaken for a shadow. */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.85, 0.95, 0.12, 16]} />
        <meshStandardMaterial color="#8e938f" roughness={0.95} />
      </mesh>
      <RoundedBox args={[0.62, 2.1, 0.42]} radius={0.12} smoothness={3} position={[0, 1.15, 0]} castShadow>
        <meshStandardMaterial color="#f3f5f4" roughness={0.4} metalness={0.2} />
      </RoundedBox>
      {/* Screen */}
      <mesh position={[0, 1.55, 0.22]}>
        <planeGeometry args={[0.42, 0.5]} />
        <meshStandardMaterial ref={screen} color="#101512" emissive={AMBER} emissiveIntensity={0.7} toneMapped={false} />
      </mesh>
      {/* Brand-green collar */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.64, 0.1, 0.44]} />
        <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.4} />
      </mesh>
      {/*
        Charging cable. The group is already rotated to the road's heading, so
        local +Z is the direction of travel and local +X points along the
        shoulder axis — meaning the cable has to run across X to reach the car,
        not along Z beside it. The sign follows whichever shoulder the post is
        standing on.

        Scaling the group (with the segment offset half its length inside)
        makes the cable extend outward from the post rather than growing in
        both directions from its middle.
      */}
      <group ref={cable} position={[0, 0.95, 0]} rotation={[0, (-sign * Math.PI) / 2, 0]}>
        <mesh position={[0, 0, 2.5]}>
          <boxGeometry args={[0.07, 0.07, 5]} />
          <meshStandardMaterial color="#15181a" roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------- service scene props */

/** Low-poly rescue van (services beat a). */
function Van({ position, rotationY }: { position: THREE.Vector3; rotationY: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[2.1, 1.9, 4.6]} radius={0.2} smoothness={2} position={[0, 1.25, 0]} castShadow>
        <meshStandardMaterial color="#eef1ef" roughness={0.45} />
      </RoundedBox>
      <mesh position={[0, 1.5, 2.15]}>
        <boxGeometry args={[1.7, 0.7, 0.08]} />
        <meshStandardMaterial color="#131a17" metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[1.06, 1.15, -0.3]}>
        <boxGeometry args={[0.03, 0.5, 2.4]} />
        <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.4} />
      </mesh>
      {[
        [0.95, 0.45, 1.5],
        [-0.95, 0.45, 1.5],
        [0.95, 0.45, -1.5],
        [-0.95, 0.45, -1.5],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.45, 0.45, 0.28, 12]} />
          <meshStandardMaterial color="#15181a" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/** Second car for the V2V beat, plus the link cable between the two. */
function V2VPartner({ position, rotationY }: { position: THREE.Vector3; rotationY: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[1.9, 0.6, 4.0]} radius={0.2} smoothness={2} position={[0, 0.6, 0]} castShadow>
        <meshStandardMaterial color="#dfe6e1" metalness={0.35} roughness={0.35} />
      </RoundedBox>
      <RoundedBox args={[1.55, 0.55, 2.1]} radius={0.14} smoothness={2} position={[0, 1.15, -0.1]}>
        <meshStandardMaterial color="#131a17" metalness={0.6} roughness={0.15} />
      </RoundedBox>
      <mesh position={[0.98, 0.9, -1.2]}>
        <boxGeometry args={[0.05, 0.16, 0.16]} />
        <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {[
        [0.9, 0.42, 1.3],
        [-0.9, 0.42, 1.3],
        [0.9, 0.42, -1.3],
        [-0.9, 0.42, -1.3],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.42, 0.26, 12]} />
          <meshStandardMaterial color="#15181a" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/** Low-poly house with a wall-mounted charger (home sharing beat). */
function House({ position, rotationY }: { position: THREE.Vector3; rotationY: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[6, 3.2, 5]} />
        <meshStandardMaterial color="#f7efe0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.45, 0]}>
        <boxGeometry args={[6.4, 0.4, 5.4]} />
        <meshStandardMaterial color="#c9b394" roughness={0.9} />
      </mesh>
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 1.9, 2.53]}>
          <boxGeometry args={[1.1, 1.0, 0.06]} />
          <meshStandardMaterial color="#25332b" emissive="#ffefc7" emissiveIntensity={0.35} />
        </mesh>
      ))}
      {/* The shared home charger */}
      <mesh position={[2.6, 1.3, 2.55]}>
        <boxGeometry args={[0.4, 0.6, 0.18]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh position={[2.6, 1.45, 2.66]}>
        <planeGeometry args={[0.22, 0.16]} />
        <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Props for the four service beats, each parked beside its own stretch of road
 * so the visitor meets them one at a time as the car passes.
 */
export function ServiceProps() {
  const layout = useMemo(() => {
    const at = (p: number, lateral: number) => {
      const pos = pointAt(p, new THREE.Vector3())
      const tan = tangentAt(p, new THREE.Vector3())
      const side = new THREE.Vector3(tan.z, 0, -tan.x).normalize().multiplyScalar(lateral)
      return { position: pos.clone().add(side), rotationY: Math.atan2(tan.x, tan.z) }
    }
    const s = sceneMid('services')
    const span = 0.035
    return {
      van: at(s - span * 1.5, 7.2),
      v2v: at(s - span * 0.4, -6.4),
      ride: at(s + span * 0.6, 7.0),
      house: at(s + span * 1.7, -11),
    }
  }, [])

  return (
    <group>
      <Van position={layout.van.position} rotationY={layout.van.rotationY} />
      <V2VPartner position={layout.v2v.position} rotationY={layout.v2v.rotationY + Math.PI} />
      {/* Ride beat: a passenger-marker post rather than a second full vehicle,
          to keep the polygon budget for the hero car. */}
      <group position={layout.ride.position} rotation={[0, layout.ride.rotationY, 0]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 2.2, 8]} />
          <meshStandardMaterial color="#4a5450" metalness={0.4} roughness={0.7} />
        </mesh>
        <mesh position={[0, 2.4, 0]}>
          <boxGeometry args={[1.1, 0.7, 0.08]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.4, 0.06]}>
          <circleGeometry args={[0.2, 16]} />
          <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.8} />
        </mesh>
      </group>
      <House position={layout.house.position} rotationY={layout.house.rotationY} />
    </group>
  )
}

/* ---------------------------------------------------------- station pins */

/** Map-style pins that rise around the car during the "find a station" beat. */
export function StationPins() {
  const group = useRef<THREE.Group>(null)
  const pins = useMemo(() => {
    const base = sceneMid('find')
    return [
      { p: base - 0.012, lateral: 9, state: 'available' as const },
      { p: base + 0.004, lateral: -8, state: 'busy' as const },
      { p: base + 0.016, lateral: 12, state: 'service' as const },
    ].map((cfg) => {
      const pos = pointAt(cfg.p, new THREE.Vector3())
      const tan = tangentAt(cfg.p, new THREE.Vector3())
      const side = new THREE.Vector3(tan.z, 0, -tan.x).normalize().multiplyScalar(cfg.lateral)
      return { ...cfg, position: pos.clone().add(side) }
    })
  }, [])

  useFrame(() => {
    const local = localProgress('find', motion.progress)
    if (!group.current) return
    group.current.children.forEach((child, i) => {
      const appear = THREE.MathUtils.clamp((local - i * 0.15) / 0.25, 0, 1)
      child.scale.setScalar(appear)
      child.visible = appear > 0.01
      child.position.y = 0.4 + appear * 1.5
    })
  })

  const colorFor = (state: 'available' | 'busy' | 'service') =>
    state === 'available' ? GREEN : state === 'busy' ? AMBER : '#8a8f8c'

  return (
    <group ref={group}>
      {pins.map((pin, i) => (
        <group key={i} position={[pin.position.x, 0.4, pin.position.z]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.55, 1.5, 12]} />
            <meshStandardMaterial
              color={colorFor(pin.state)}
              emissive={colorFor(pin.state)}
              emissiveIntensity={0.55}
            />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.55, 14, 12]} />
            <meshStandardMaterial
              color={colorFor(pin.state)}
              emissive={colorFor(pin.state)}
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ----------------------------------------------------------- Oman "map" */

/**
 * Coverage beat. Deliberately a flat, stylised plate on the ground with
 * pulsing dots — not a geographic 3D model, and not the KML feed, which
 * describes someone else's live charger network.
 */
export function CoveragePlate() {
  const anchor = useMemo(() => pointAt(sceneMid('coverage'), new THREE.Vector3()), [])
  const group = useRef<THREE.Group>(null)
  const mode = useJourney((s) => s.mode)
  const glow = useMemo(() => makeGlowTexture(), [])

  // Stylised placements, laid out relative to the plate rather than to real
  // coordinates: Muscat NE, Sohar N, Nizwa centre, Sur E, Salalah SW.
  const dots = useMemo(
    () => [
      [7, -6],
      [3, -11],
      [1, -2],
      [11, 0],
      [-9, 9],
    ] as [number, number][],
    [],
  )

  useFrame(({ clock }) => {
    const local = localProgress('coverage', motion.progress)
    if (!group.current) return
    const reveal = THREE.MathUtils.clamp(local / 0.35, 0, 1)
    group.current.visible = local > 0.01 && local < 0.995
    group.current.scale.setScalar(reveal)
    group.current.children.forEach((child, i) => {
      if (child.type !== 'Sprite') return
      const m = (child as THREE.Sprite).material as THREE.SpriteMaterial
      m.opacity = reveal * (0.45 + 0.35 * Math.sin(clock.elapsedTime * 2 + i))
    })
  })

  return (
    <group ref={group} position={[anchor.x, 0.05, anchor.z - 4]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <planeGeometry args={[42, 34]} />
        <meshBasicMaterial
          color={mode === 'night' ? '#0f1a11' : '#fff6ea'}
          transparent
          opacity={0.82}
        />
      </mesh>
      {dots.map(([x, y], i) => (
        <mesh key={`dot-${i}`} position={[x, y, 0.02]}>
          <circleGeometry args={[0.7, 16]} />
          <meshBasicMaterial color={i < 3 ? GREEN : AMBER} />
        </mesh>
      ))}
      {dots.map(([x, y], i) => (
        <sprite key={`pulse-${i}`} position={[x, y, 0.05]} scale={[5, 5, 1]}>
          <spriteMaterial
            map={glow}
            color={i < 3 ? GREEN : AMBER}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  )
}

/* -------------------------------------------------------- finale confetti */

/** Success particles for scene 14. Skipped entirely on lite/reduced-motion. */
export function FinaleParticles() {
  const tier = useJourney((s) => s.tier)
  const reduced = useJourney((s) => s.reducedMotion)
  const points = useRef<THREE.Points>(null)
  const count = tier === 'lite' ? 40 : 120

  const { geometry, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const s = new Float32Array(count)
    const green = new THREE.Color(GREEN)
    const amber = new THREE.Color(AMBER)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14
      positions[i * 3 + 1] = Math.random() * 6
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14
      const c = Math.random() > 0.35 ? green : amber
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
      s[i] = 0.5 + Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return { geometry: g, seeds: s }
  }, [count])

  useFrame((_, delta) => {
    const local = localProgress('finale', motion.progress)
    const mesh = points.current
    if (!mesh) return
    const active = local > 0.25
    mesh.visible = active
    if (!active) return

    const carPos = pointAt(motion.progress, new THREE.Vector3())
    mesh.position.set(carPos.x, 0, carPos.z)

    const attr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      let y = attr.getY(i) + delta * seeds[i] * 2.2
      if (y > 7) y = 0
      attr.setY(i, y)
    }
    attr.needsUpdate = true
    const mat = mesh.material as THREE.PointsMaterial
    mat.opacity = THREE.MathUtils.clamp((local - 0.25) / 0.2, 0, 1) * 0.9
  })

  if (reduced) return null

  return (
    <points ref={points} geometry={geometry} visible={false}>
      <pointsMaterial
        size={0.16}
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

/* --------------------------------------------------------- download gate */

/** A simple arch by the road, marking the download beat. */
export function DownloadGate() {
  const layout = useMemo(() => {
    const p = sceneMid('download')
    const pos = pointAt(p, new THREE.Vector3())
    const tan = tangentAt(p, new THREE.Vector3())
    return { pos, rotationY: Math.atan2(tan.x, tan.z) }
  }, [])

  return (
    <group position={[layout.pos.x, 0, layout.pos.z - 6]} rotation={[0, layout.rotationY, 0]}>
      {[-5.6, 5.6].map((x) => (
        <mesh key={x} position={[x, 3, 0]} castShadow>
          <boxGeometry args={[0.5, 6, 0.5]} />
          <meshStandardMaterial color="#f3f5f4" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 6.2, 0]}>
        <boxGeometry args={[11.7, 0.6, 0.5]} />
        <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.35} />
      </mesh>
    </group>
  )
}
