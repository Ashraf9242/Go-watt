import './styles/pages.css'

/**
 * Tiny script for the canvas-free pages: mode toggle (shared with the journey
 * via the same localStorage key) and the FAQ accordion. No React, no three.js
 * — these pages should stay in the tens of kilobytes.
 */

const KEY = 'gowatt:mode'

function applyMode(mode: 'day' | 'night') {
  document.documentElement.dataset.mode = mode
  const btn = document.querySelector<HTMLButtonElement>('[data-mode-toggle]')
  if (btn) {
    btn.textContent = mode === 'night' ? '☀' : '☾'
    btn.setAttribute('aria-pressed', String(mode === 'night'))
  }
  const logo = document.querySelector<HTMLImageElement>('[data-logo]')
  if (logo) {
    logo.src =
      mode === 'night' ? '/brand/logo/gowatt-logo-orange.png' : '/brand/logo/gowatt-logo.svg'
  }
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* ignore */
  }
}

const saved = localStorage.getItem(KEY)
applyMode(saved === 'night' ? 'night' : 'day')

document.querySelector('[data-mode-toggle]')?.addEventListener('click', () => {
  applyMode(document.documentElement.dataset.mode === 'night' ? 'day' : 'night')
})

// FAQ accordion: same grid-template-rows technique as the journey, with
// aria-expanded kept truthful.
document.querySelectorAll<HTMLButtonElement>('[data-acc-btn]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.getAttribute('aria-controls') ?? '')
    if (!panel) return
    const open = btn.getAttribute('aria-expanded') === 'true'
    btn.setAttribute('aria-expanded', String(!open))
    panel.dataset.open = String(!open)
  })
})
