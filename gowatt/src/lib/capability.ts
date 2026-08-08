import type { Tier } from '../store/journey'

export type FallbackReason = 'motion' | 'network' | 'device' | 'manual' | 'webgl' | null

export type Capability = {
  tier: Tier
  reason: FallbackReason
  reducedMotion: boolean
  dpr: [number, number]
}

type NetworkInfo = { effectiveType?: string; saveData?: boolean }

function connection(): NetworkInfo | undefined {
  return (navigator as Navigator & { connection?: NetworkInfo }).connection
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl'),
    )
  } catch {
    return false
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/**
 * Decides up front whether to load the 3D scene at all.
 *
 * A slow Omani mobile connection or a low-core Android device must never be
 * handed a WebGL scene it will stutter through — those visitors go straight
 * to the illustrated 2D journey, which carries the same content.
 */
export function detectCapability(): Capability {
  if (typeof window === 'undefined') {
    return { tier: 'full', reason: null, reducedMotion: false, dpr: [1, 1.5] }
  }

  const reducedMotion = prefersReducedMotion()
  const manual = window.localStorage.getItem('gowatt:tier')

  if (manual === 'fallback') {
    return { tier: 'fallback', reason: 'manual', reducedMotion, dpr: [1, 1] }
  }

  if (!hasWebGL()) {
    return { tier: 'fallback', reason: 'webgl', reducedMotion, dpr: [1, 1] }
  }

  if (reducedMotion && manual !== 'full') {
    return { tier: 'fallback', reason: 'motion', reducedMotion, dpr: [1, 1] }
  }

  const net = connection()
  const slowNet =
    net?.saveData === true ||
    net?.effectiveType === 'slow-2g' ||
    net?.effectiveType === '2g' ||
    net?.effectiveType === '3g'

  if (slowNet && manual !== 'full') {
    return { tier: 'fallback', reason: 'network', reducedMotion, dpr: [1, 1] }
  }

  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4

  if ((cores <= 2 || memory <= 2) && manual !== 'full') {
    return { tier: 'fallback', reason: 'device', reducedMotion, dpr: [1, 1] }
  }

  // Mid-range devices keep the 3D scene but at a lower pixel ratio and with
  // shadows/particles disabled (see `tier === 'lite'` checks in the scene).
  const lite = cores <= 4 || window.innerWidth < 480
  return {
    tier: lite ? 'lite' : 'full',
    reason: null,
    reducedMotion,
    dpr: lite ? [1, 1.25] : [1, 1.75],
  }
}

export function setPreferredTier(tier: 'full' | 'fallback'): void {
  try {
    window.localStorage.setItem('gowatt:tier', tier)
  } catch {
    /* ignore */
  }
}
