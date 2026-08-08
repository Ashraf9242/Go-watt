import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, Preload } from '@react-three/drei'
import {
  ChargerPost,
  CoveragePlate,
  DownloadGate,
  FinaleParticles,
  Road,
  ServiceProps,
  StationPins,
  Streetlights,
} from './Environment'
import { CameraRig, CarRig } from './Rig'
import { motion, useJourney } from '../store/journey'
import { detectCapability } from '../lib/capability'
import { useT } from '../i18n/useT'

/**
 * Day/night lighting. Day is a bright directional sun over a warm ambient;
 * night drops the sun almost to nothing and cools the ambient, leaving the
 * street lamps (Environment.tsx) as the actual light sources.
 */
function Lighting() {
  const mode = useJourney((s) => s.mode)
  const tier = useJourney((s) => s.tier)
  const sun = useRef<THREE.DirectionalLight>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)

  const dayColor = new THREE.Color('#fff4e2')
  const nightColor = new THREE.Color('#26433a')

  useFrame((_, delta) => {
    const night = mode === 'night'
    if (sun.current) {
      sun.current.intensity = THREE.MathUtils.damp(sun.current.intensity, night ? 0.12 : 2.5, 3, delta)
    }
    if (ambient.current) {
      ambient.current.intensity = THREE.MathUtils.damp(
        ambient.current.intensity,
        night ? 0.22 : 1.1,
        3,
        delta,
      )
      ambient.current.color.lerp(night ? nightColor : dayColor, 1 - Math.pow(0.02, delta))
    }
    if (hemi.current) {
      hemi.current.intensity = THREE.MathUtils.damp(hemi.current.intensity, night ? 0.18 : 0.9, 3, delta)
    }
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={1.1} color="#fff4e2" />
      <hemisphereLight ref={hemi} intensity={0.9} color="#fff6ea" groundColor="#c9a26b" />
      <directionalLight
        ref={sun}
        position={[18, 26, 12]}
        intensity={2.5}
        color="#fff3dd"
        castShadow={tier === 'full'}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-far={120}
      />
    </>
  )
}

/**
 * Fog hides the far end of the road so the scene never reveals that the world
 * simply stops, and lets us cull aggressively.
 */
function Atmosphere() {
  const mode = useJourney((s) => s.mode)
  const { scene } = useThree()
  useEffect(() => {
    // Tuned so distant road furniture fades out rather than reading as pale
    // boxes stacked on the horizon.
    scene.fog = new THREE.Fog(mode === 'night' ? '#0a0f0d' : '#f2e2c8', 55, 150)
    return () => {
      scene.fog = null
    }
  }, [scene, mode])
  return null
}

/**
 * Render-loop governor.
 *
 * The loop is invalidated on scroll (see useScrollJourney) and runs on demand,
 * but we also hard-stop it when the tab is hidden or once the visitor is past
 * the finale and under the footer — a 3D loop running beneath a footer is pure
 * battery burn on mobile.
 */
function LoopGovernor() {
  const { invalidate } = useThree()
  const raf = useRef<number | null>(null)

  useEffect(() => {
    // With frameloop="demand" nothing renders unless something asks for it, so
    // this driver is the single place that decides whether a frame is worth
    // drawing at all. Ambient motion (charge pulse, particles, light ramps)
    // needs frames even when the visitor has stopped scrolling — but only
    // while the journey is actually on screen and the tab is in front.
    const tick = () => {
      if (!document.hidden && motion.progress < 0.999) invalidate()
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)

    // requestAnimationFrame is already throttled to a stop by the browser when
    // the tab is hidden; the document.hidden guard means that even the frames
    // it does deliver draw nothing.
    const onVisibility = () => {
      if (!document.hidden) invalidate()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [invalidate])

  return null
}

export function JourneyScene() {
  const setTier = useJourney((s) => s.setTier)
  const setReducedMotion = useJourney((s) => s.setReducedMotion)
  const setLoaded = useJourney((s) => s.setLoaded)
  const tier = useJourney((s) => s.tier)
  const mode = useJourney((s) => s.mode)
  const { t } = useT()

  useEffect(() => {
    const cap = detectCapability()
    setTier(cap.tier)
    setReducedMotion(cap.reducedMotion)
  }, [setTier, setReducedMotion])

  return (
    <div className="gw-canvas-layer" aria-hidden="true">
      <Canvas
        frameloop="demand"
        dpr={tier === 'lite' ? [1, 1.25] : [1, 1.75]}
        shadows={tier === 'full'}
        gl={{ antialias: tier === 'full', powerPreference: 'high-performance', alpha: true }}
        camera={{ fov: 42, near: 0.5, far: 400, position: [0, 5, 12] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = mode === 'night' ? 1.15 : 1.0
          setLoaded(true)
        }}
      >
        {/* The canvas is decorative: it repeats what the HTML overlays already
            state in text, so it is hidden from assistive technology and
            described once, here. */}
        <Suspense fallback={null}>
          <Lighting />
          <Atmosphere />
          <Road />
          <Streetlights />
          <ChargerPost />
          <StationPins />
          <ServiceProps />
          <CoveragePlate />
          <DownloadGate />
          <FinaleParticles />
          <CarRig />
          <CameraRig />
          <LoopGovernor />
          <AdaptiveDpr pixelated />
          <Preload all />
        </Suspense>
      </Canvas>
      <span className="sr-only">{t.a11y.canvasLabel}</span>
    </div>
  )
}
