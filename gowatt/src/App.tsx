import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Footer, Header, Loader, StickyCta, TierSwitch } from './components/Chrome'
import { RegisterDialog } from './components/RegisterDialog'
import { Scenes } from './components/Scenes'
import { Fallback2D } from './components/Fallback2D'
import { useJourney } from './store/journey'
import { detectCapability, type Capability } from './lib/capability'
import { useOverlayReveals, useScrollJourney } from './journey/useScrollJourney'
import { useT } from './i18n/useT'
import { TOTAL_VH } from './journey/scenes'

// The 3D bundle (three + drei) is code-split, so visitors who get the 2D
// journey never download a byte of WebGL code, and the hero text paints
// without waiting on it.
const JourneyScene = lazy(() =>
  import('./three/Scene').then((m) => ({ default: m.JourneyScene })),
)

export default function App() {
  const { t, lang } = useT()
  const [cap, setCap] = useState<Capability | null>(null)

  const setTier = useJourney((s) => s.setTier)
  const setReducedMotion = useJourney((s) => s.setReducedMotion)
  const setMode = useJourney((s) => s.setMode)
  const mode = useJourney((s) => s.mode)
  const tier = useJourney((s) => s.tier)
  const reduced = useJourney((s) => s.reducedMotion)

  // Capability is resolved once, before any 3D code is requested.
  useEffect(() => {
    const detected = detectCapability()
    setCap(detected)
    setTier(detected.tier)
    setReducedMotion(detected.reducedMotion)
  }, [setTier, setReducedMotion])

  // Apply the persisted mode to <html> on first paint.
  useEffect(() => {
    setMode(mode)
  }, [setMode, mode])

  useEffect(() => {
    document.title = t.meta.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.meta.description)
  }, [t, lang])

  const use3D = cap !== null && cap.tier !== 'fallback'

  useScrollJourney(use3D)
  useOverlayReveals(use3D, reduced)

  const journeyHeight = useMemo(() => `${TOTAL_VH}svh`, [])

  if (cap === null) {
    // First paint before detection settles: header + hero text only, no canvas.
    return (
      <>
        <Header />
        <div style={{ minHeight: '100svh' }} />
      </>
    )
  }

  if (!use3D) {
    return (
      <>
        <Header />
        <Fallback2D reason={cap.reason} />
        <StickyCta />
        <RegisterDialog />
        <Footer />
      </>
    )
  }

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[70] gw-btn">
        {t.nav.skip}
      </a>

      <Loader />
      <Header />

      <Suspense fallback={null}>
        <JourneyScene />
      </Suspense>

      {/* The scroll track. Its height is the sum of every scene's `vh`, and
          ScrollTrigger maps exactly this element to progress 0→1. */}
      <main id="journey" style={{ minHeight: journeyHeight }}>
        <div id="main">
          <Scenes />
        </div>
      </main>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-6">
        <TierSwitch reason={null} />
      </div>

      <StickyCta />
      <RegisterDialog />
      <Footer />
      {tier === 'lite' && <span className="sr-only">lite rendering mode</span>}
    </>
  )
}
