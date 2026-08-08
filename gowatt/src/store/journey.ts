import { create } from 'zustand'

export type Mode = 'day' | 'night'
export type Lang = 'ar' | 'en'
export type Tier = 'full' | 'lite' | 'fallback'

/**
 * Scroll progress is written every scroll frame, so it deliberately lives
 * OUTSIDE React state — the 3D rig reads `motion.progress` inside useFrame
 * and nothing re-renders. Only discrete state (mode, scene index, charge
 * bucket) goes through the store below.
 */
export const motion = {
  progress: 0,
  /** 0→1 inside the fast-charge beat (scene 6) only. */
  charge: 0,
  /** Set to 1 once the finale spin has been triggered. */
  finale: 0,
}

type JourneyState = {
  mode: Mode
  lang: Lang
  tier: Tier
  loaded: boolean
  progressPercent: number
  scene: number
  chargePercent: number
  complete: boolean
  reducedMotion: boolean
  registerOpen: boolean
  setMode: (m: Mode) => void
  toggleMode: () => void
  setLang: (l: Lang) => void
  setTier: (t: Tier) => void
  setLoaded: (v: boolean) => void
  setProgressPercent: (v: number) => void
  setScene: (i: number) => void
  setChargePercent: (v: number) => void
  setComplete: (v: boolean) => void
  setReducedMotion: (v: boolean) => void
  setRegisterOpen: (v: boolean) => void
}

const STORAGE_KEY = 'gowatt:mode'

function initialMode(): Mode {
  if (typeof window === 'undefined') return 'day'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'day' || saved === 'night') return saved
  return 'day' // day is the site default, regardless of OS preference
}

export const useJourney = create<JourneyState>((set, get) => ({
  mode: initialMode(),
  lang: 'ar',
  tier: 'full',
  loaded: false,
  progressPercent: 0,
  scene: 0,
  chargePercent: 0,
  complete: false,
  reducedMotion: false,
  registerOpen: false,

  setMode: (mode) => {
    set({ mode })
    document.documentElement.dataset.mode = mode
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* private browsing — mode simply won't persist */
    }
  },
  toggleMode: () => get().setMode(get().mode === 'day' ? 'night' : 'day'),
  setLang: (lang) => set({ lang }),
  setTier: (tier) => set({ tier }),
  setLoaded: (loaded) => set({ loaded }),
  setProgressPercent: (progressPercent) => set({ progressPercent }),
  setScene: (scene) => set({ scene }),
  setChargePercent: (chargePercent) => set({ chargePercent }),
  setComplete: (complete) => set({ complete }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setRegisterOpen: (registerOpen) => set({ registerOpen }),
}))
