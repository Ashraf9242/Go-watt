import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useJourney } from '../store/journey'
import { SCENES, localProgress, sceneIndexAt } from './scenes'

gsap.registerPlugin(ScrollTrigger)

/**
 * SCROLL → PROGRESS
 *
 * A single ScrollTrigger maps the whole page height to a normalised 0→1 value.
 * That value is written to `motion.progress` (a plain object, not React state)
 * so the 3D rig can read it every frame without causing renders.
 *
 * Only *discrete* derivatives are pushed into the store, and each one is
 * throttled to actual changes: the current scene index, the charge percentage
 * rounded to whole numbers, and the completion flag. That keeps React renders
 * to a few dozen over the entire journey instead of one per scroll event.
 */
export function useScrollJourney(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const store = useJourney.getState()
    let lastScene = -1
    let lastCharge = -1
    let lastPercent = -1
    let lastComplete = false

    const trigger = ScrollTrigger.create({
      trigger: '#journey',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress
        motion.progress = p

        const percent = Math.round(p * 100)
        if (percent !== lastPercent) {
          lastPercent = percent
          store.setProgressPercent(percent)
        }

        const scene = sceneIndexAt(p)
        if (scene !== lastScene) {
          lastScene = scene
          store.setScene(scene)
        }

        // Charge ramps with scroll *inside the charge beat only*, so the
        // percentage the visitor sees is literally driven by their scrolling.
        const chargeLocal = localProgress('charge', p)
        motion.charge = chargeLocal
        const charge = Math.round(chargeLocal * 100)
        if (charge !== lastCharge) {
          lastCharge = charge
          store.setChargePercent(charge)
        }

        const finaleLocal = localProgress('finale', p)
        motion.finale = finaleLocal
        const complete = finaleLocal > 0.25
        if (complete !== lastComplete) {
          lastComplete = complete
          store.setComplete(complete)
        }
      },
    })

    // ScrollTrigger needs a measure pass once fonts land and the overlay
    // tracks have their final heights.
    const refresh = () => ScrollTrigger.refresh()
    if (document.fonts?.ready) void document.fonts.ready.then(refresh)
    window.addEventListener('load', refresh)

    return () => {
      trigger.kill()
      window.removeEventListener('load', refresh)
    }
  }, [enabled])
}

/**
 * Per-scene entrance animations for the HTML overlay cards.
 *
 * Deliberately separate from the progress scrub above: a card fading in is an
 * *event* ("this beat has arrived"), not something that should rewind smoothly
 * as the visitor nudges the scrollbar.
 */
export function useOverlayReveals(enabled: boolean, reduced: boolean) {
  useEffect(() => {
    if (!enabled) return

    const ctx = gsap.context(() => {
      SCENES.forEach((scene) => {
        const cards = gsap.utils.toArray<HTMLElement>(
          `[data-scene="${scene.id}"] [data-reveal]`,
        )
        if (cards.length === 0) return

        if (reduced) {
          gsap.set(cards, { opacity: 1, y: 0 })
          return
        }

        gsap.fromTo(
          cards,
          { opacity: 0, y: 26 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: 'power2.out',
            stagger: 0.12,
            scrollTrigger: {
              trigger: `[data-scene="${scene.id}"]`,
              start: 'top 72%',
              toggleActions: 'play none none reverse',
            },
          },
        )
      })
    })

    return () => ctx.revert()
  }, [enabled, reduced])
}
