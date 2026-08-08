/**
 * The single source of truth for the journey timeline.
 *
 * Each scene owns a `weight` — how much scroll distance it gets relative to
 * its siblings. Normalised ranges (start/end on the 0→1 progress value) are
 * derived from the weights, so re-pacing the story means editing one number
 * here and nothing else. `vh` controls the DOM track height for that scene.
 */

export type SceneId =
  | 'hero'
  | 'login'
  | 'profile'
  | 'find'
  | 'book'
  | 'charge'
  | 'pay'
  | 'services'
  | 'coverage'
  | 'points'
  | 'download'
  | 'about'
  | 'faq'
  | 'finale'

export type SceneDef = {
  id: SceneId
  /** Scene number as used in the build brief (1–14). */
  n: number
  weight: number
  vh: number
  /** Camera behaviour for this beat. */
  camera: 'follow' | 'wide' | 'orbit-out' | 'calm' | 'finale'
}

const RAW: SceneDef[] = [
  { id: 'hero', n: 1, weight: 1.0, vh: 130, camera: 'follow' },
  { id: 'login', n: 2, weight: 0.8, vh: 100, camera: 'follow' },
  { id: 'profile', n: 3, weight: 0.8, vh: 100, camera: 'follow' },
  { id: 'find', n: 4, weight: 0.8, vh: 100, camera: 'follow' },
  { id: 'book', n: 5, weight: 0.8, vh: 100, camera: 'follow' },
  { id: 'charge', n: 6, weight: 1.4, vh: 170, camera: 'wide' },
  { id: 'pay', n: 7, weight: 0.7, vh: 100, camera: 'wide' },
  { id: 'services', n: 8, weight: 2.0, vh: 260, camera: 'follow' },
  { id: 'coverage', n: 9, weight: 1.2, vh: 150, camera: 'orbit-out' },
  { id: 'points', n: 10, weight: 1.0, vh: 130, camera: 'follow' },
  { id: 'download', n: 11, weight: 0.8, vh: 110, camera: 'follow' },
  { id: 'about', n: 12, weight: 0.8, vh: 110, camera: 'calm' },
  { id: 'faq', n: 13, weight: 0.9, vh: 120, camera: 'calm' },
  { id: 'finale', n: 14, weight: 1.2, vh: 150, camera: 'finale' },
]

export type SceneRange = SceneDef & { start: number; end: number }

const total = RAW.reduce((sum, s) => sum + s.weight, 0)

let cursor = 0
export const SCENES: SceneRange[] = RAW.map((s) => {
  const start = cursor
  cursor += s.weight / total
  return { ...s, start, end: cursor }
})

export const SCENE_BY_ID = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<
  SceneId,
  SceneRange
>

export const TOTAL_VH = RAW.reduce((sum, s) => sum + s.vh, 0)

/** 0→1 progress *within* a scene, clamped at both ends. */
export function localProgress(id: SceneId, p: number): number {
  const s = SCENE_BY_ID[id]
  return clamp01((p - s.start) / (s.end - s.start))
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function sceneIndexAt(p: number): number {
  for (let i = SCENES.length - 1; i >= 0; i--) if (p >= SCENES[i].start) return i
  return 0
}

/** Services scene has four sub-beats (van, V2V, ride, home sharing). */
export const SERVICE_BEATS = 4
