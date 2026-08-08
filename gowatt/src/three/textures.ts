import * as THREE from 'three'

/**
 * Every texture in the scene is generated on the client at start-up.
 * Nothing here costs a byte of download, which is most of how the whole
 * scene stays inside the ~4MB budget with room to spare.
 */

const ASPHALT = '#2e2a24'
const AMBER = '#fbb03b'

let roadTexture: THREE.CanvasTexture | null = null

/** Asphalt with a dashed amber centre line and soft shoulder edges. */
export function makeRoadTexture(): THREE.CanvasTexture {
  if (roadTexture) return roadTexture

  const w = 128
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = ASPHALT
  ctx.fillRect(0, 0, w, h)

  // Aggregate grain — keeps the asphalt from reading as flat plastic.
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const v = 0.06 + Math.random() * 0.16
    ctx.fillStyle = `rgba(255,246,234,${v.toFixed(3)})`
    ctx.fillRect(x, y, 1, 1)
  }
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = `rgba(0,0,0,${(0.05 + Math.random() * 0.18).toFixed(3)})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2)
  }

  // Shoulder edge lines, deliberately muted so the amber centre line leads.
  ctx.fillStyle = 'rgba(240,240,232,0.30)'
  ctx.fillRect(6, 0, 3, h)
  ctx.fillRect(w - 9, 0, 3, h)

  // Dashed centre line in brand amber — the brief's deliberate brand touch
  // in place of the conventional white dashes.
  ctx.fillStyle = AMBER
  const dash = 74
  const gap = 58
  for (let y = 0; y < h; y += dash + gap) {
    ctx.fillRect(w / 2 - 3.5, y, 7, dash)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  tex.colorSpace = THREE.SRGBColorSpace
  roadTexture = tex
  return tex
}

let groundTexture: THREE.CanvasTexture | null = null

/** Sand/gravel ground plane either side of the road. */
export function makeGroundTexture(day = true): THREE.CanvasTexture {
  if (groundTexture) return groundTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = day ? '#f2e2c6' : '#141c16'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 9000; i++) {
    const dark = Math.random() > 0.5
    ctx.fillStyle = dark ? 'rgba(120,96,60,0.10)' : 'rgba(255,255,255,0.10)'
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(60, 60)
  tex.colorSpace = THREE.SRGBColorSpace
  groundTexture = tex
  return tex
}

/** Simple radial falloff sprite, reused by glows, light pools and particles. */
let glowTexture: THREE.CanvasTexture | null = null
export function makeGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  glowTexture = tex
  return tex
}

export function disposeGeneratedTextures(): void {
  roadTexture?.dispose()
  groundTexture?.dispose()
  glowTexture?.dispose()
  roadTexture = groundTexture = glowTexture = null
}
