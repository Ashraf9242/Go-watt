import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Detailed } from '@react-three/drei'
import { motion, useJourney } from '../store/journey'
import { localProgress } from '../journey/scenes'
import { travelProgress } from './road'

/**
 * GENERIC EV CROSSOVER — modelled procedurally in code.
 *
 * Deliberately NOT a real vehicle. The two .glb files shipped with the brief
 * are a Tesla Model 3 and a BYD Dolphin: both are trademarked designs and
 * both are 22MB/34MB, which is 5–8× the entire scene budget on their own.
 * This silhouette is an original crossover form — a tapered greenhouse over
 * a high beltline — carrying brand-green accents to tie it to Go Watt.
 *
 * Because it is geometry rather than an asset, it downloads as zero bytes,
 * needs no Draco/KTX2 step, and carries no licensing question at all.
 * Swapping in a licensed .glb later is documented in the README.
 */

const BODY_COLOR = '#f4f6f5'
const BODY_COLOR_NIGHT = '#dfe6e1'
const GLASS = '#131a17'
const TRIM = '#1b201d'
const ACCENT = '#28844c' // brand green
const AMBER = '#fbb03b'
const COMPLETE = '#3fae6a'

type Detail = 'high' | 'low'

/**
 * The axle runs along local X, so rolling the wheel is a rotation on the
 * outer group's X axis — which is what the frame loop drives below.
 */
function Wheel({ detail, position }: { detail: Detail; position: [number, number, number] }) {
  const segments = detail === 'high' ? 22 : 10
  return (
    <group name="gw-wheel" position={position}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.28, segments]} />
          <meshStandardMaterial color="#15181a" roughness={0.85} />
        </mesh>
        {detail === 'high' && (
          <mesh position={[0, 0.145, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.03, segments]} />
            <meshStandardMaterial color="#8d9499" metalness={0.85} roughness={0.3} />
          </mesh>
        )}
      </group>
    </group>
  )
}

function CarMesh({
  detail,
  bodyColor,
  portRef,
  headlightIntensity,
}: {
  detail: Detail
  bodyColor: string
  portRef: React.MutableRefObject<THREE.MeshStandardMaterial | null>
  headlightIntensity: number
}) {
  const smooth = detail === 'high' ? 4 : 1

  return (
    <group>
      {/* Lower body */}
      <RoundedBox args={[2.0, 0.62, 4.3]} radius={0.22} smoothness={smooth} position={[0, 0.62, 0]} castShadow>
        <meshStandardMaterial color={bodyColor} metalness={0.35} roughness={0.32} />
      </RoundedBox>

      {/* Shoulder / beltline volume */}
      <RoundedBox args={[1.94, 0.42, 3.9]} radius={0.18} smoothness={smooth} position={[0, 1.02, -0.05]}>
        <meshStandardMaterial color={bodyColor} metalness={0.35} roughness={0.3} />
      </RoundedBox>

      {/* Greenhouse — narrower than the body and set back, so the profile reads
          as a crossover rather than a van. */}
      <RoundedBox args={[1.52, 0.5, 1.95]} radius={0.16} smoothness={smooth} position={[0, 1.4, -0.3]}>
        <meshStandardMaterial color={GLASS} metalness={0.6} roughness={0.15} />
      </RoundedBox>
      {/* Raked windscreen and rear glass: the tilt is what breaks up the
          otherwise symmetrical box. */}
      <mesh position={[0, 1.32, 0.78]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[1.5, 0.9, 0.07]} />
        <meshStandardMaterial color={GLASS} metalness={0.65} roughness={0.12} />
      </mesh>
      <mesh position={[0, 1.34, -1.31]} rotation={[0.48, 0, 0]}>
        <boxGeometry args={[1.46, 0.78, 0.07]} />
        <meshStandardMaterial color={GLASS} metalness={0.65} roughness={0.12} />
      </mesh>
      {/* Roof panel */}
      <RoundedBox args={[1.42, 0.14, 1.7]} radius={0.07} smoothness={smooth} position={[0, 1.66, -0.34]}>
        <meshStandardMaterial color={TRIM} roughness={0.6} />
      </RoundedBox>
      {/* Bonnet, so front and rear are not interchangeable */}
      <RoundedBox args={[1.86, 0.24, 1.15]} radius={0.11} smoothness={smooth} position={[0, 1.06, 1.5]}>
        <meshStandardMaterial color={bodyColor} metalness={0.35} roughness={0.3} />
      </RoundedBox>
      {/* Rear spoiler lip */}
      <mesh position={[0, 1.6, -1.62]}>
        <boxGeometry args={[1.44, 0.08, 0.3]} />
        <meshStandardMaterial color={TRIM} roughness={0.7} />
      </mesh>

      {/* Brand-green side accent — the only branding on the vehicle */}
      <mesh position={[1.005, 0.72, -0.1]}>
        <boxGeometry args={[0.02, 0.07, 3.1]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[-1.005, 0.72, -0.1]}>
        <boxGeometry args={[0.02, 0.07, 3.1]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.35} />
      </mesh>

      {/* Full-width light bars, front and rear */}
      <mesh position={[0, 0.86, 2.14]}>
        <boxGeometry args={[1.72, 0.1, 0.06]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#fff3d6"
          emissiveIntensity={0.9 + headlightIntensity * 2.2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.9, -2.14]}>
        <boxGeometry args={[1.7, 0.09, 0.06]} />
        <meshStandardMaterial
          color="#c8342a"
          emissive="#ff4436"
          emissiveIntensity={0.5 + headlightIntensity * 1.2}
          toneMapped={false}
        />
      </mesh>

      {/* Charge port — amber while charging, green when complete.
          Its state is always mirrored by a text label in the HTML overlay,
          so charge state is never communicated by colour alone. */}
      <mesh position={[-1.01, 0.95, -1.35]} rotation={[0, 0, 0]}>
        <circleGeometry args={[0.15, detail === 'high' ? 20 : 8]} />
        <meshStandardMaterial
          ref={portRef}
          color="#2a2f2c"
          emissive={AMBER}
          emissiveIntensity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bumpers / cladding */}
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[2.02, 0.2, 4.05]} />
        <meshStandardMaterial color={TRIM} roughness={0.85} />
      </mesh>

      <Wheel detail={detail} position={[0.94, 0.42, 1.42]} />
      <Wheel detail={detail} position={[-0.94, 0.42, 1.42]} />
      <Wheel detail={detail} position={[0.94, 0.42, -1.42]} />
      <Wheel detail={detail} position={[-0.94, 0.42, -1.42]} />
    </group>
  )
}

export function Car() {
  const mode = useJourney((s) => s.mode)
  const tier = useJourney((s) => s.tier)
  const reduced = useJourney((s) => s.reducedMotion)

  const spinRef = useRef<THREE.Group>(null)
  const wheels = useRef<THREE.Object3D[]>([])
  const portHigh = useRef<THREE.MeshStandardMaterial | null>(null)
  const portLow = useRef<THREE.MeshStandardMaterial | null>(null)
  const lastProgress = useRef(0)

  const bodyColor = mode === 'night' ? BODY_COLOR_NIGHT : BODY_COLOR
  const headlights = mode === 'night' ? 1 : 0

  const amber = useMemo(() => new THREE.Color(AMBER), [])
  const green = useMemo(() => new THREE.Color(COMPLETE), [])

  useFrame((_, delta) => {
    const p = motion.progress

    // Wheel roll follows distance actually travelled — not clock time and not
    // raw scroll. So the wheels stop when the visitor stops scrolling, and they
    // also stop while the car is parked at the charger even though scroll
    // progress keeps climbing through the charging beat.
    const travel = travelProgress(p)
    const travelled = Math.abs(travel - lastProgress.current)
    lastProgress.current = travel
    if (spinRef.current && !reduced) {
      // Collected once; both LOD levels contribute wheels, and rotating a
      // hidden LOD level costs nothing.
      if (wheels.current.length === 0) {
        spinRef.current.traverse((o) => {
          if (o.name === 'gw-wheel') wheels.current.push(o)
        })
      }
      for (const w of wheels.current) w.rotation.x -= travelled * 420
    }

    // Charging glow: amber during the charge beat, green once complete.
    const chargeLocal = localProgress('charge', p)
    const finaleLocal = localProgress('finale', p)
    const pulse = reduced ? 1 : 0.72 + Math.sin(performance.now() * 0.006) * 0.28
    const charging = chargeLocal > 0.05 && chargeLocal < 1 && finaleLocal === 0
    const intensity = finaleLocal > 0.15 ? 2.4 : charging ? 1.6 * pulse : chargeLocal >= 1 ? 1.1 : 0

    for (const ref of [portHigh, portLow]) {
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

  return (
    <group ref={spinRef}>
      {tier === 'lite' ? (
        <CarMesh
          detail="low"
          bodyColor={bodyColor}
          portRef={portLow}
          headlightIntensity={headlights}
        />
      ) : (
        // LOD: the detailed body is swapped for the cheap one once the car is
        // small on screen (coverage zoom-out, FAQ background).
        <Detailed distances={[0, 55]}>
          <CarMesh
            detail="high"
            bodyColor={bodyColor}
            portRef={portHigh}
            headlightIntensity={headlights}
          />
          <CarMesh
            detail="low"
            bodyColor={bodyColor}
            portRef={portLow}
            headlightIntensity={headlights}
          />
        </Detailed>
      )}
    </group>
  )
}
