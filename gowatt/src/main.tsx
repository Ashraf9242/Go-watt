import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { useJourney } from './store/journey'

// The persisted mode is applied before React mounts so there is no flash of
// the wrong palette.
const saved = window.localStorage.getItem('gowatt:mode')
document.documentElement.dataset.mode = saved === 'night' ? 'night' : 'day'

// /en/index.html carries data-lang="en"; the language therefore comes from the
// URL that was requested, not from a client-side toggle.
if (document.documentElement.dataset.lang === 'en') {
  useJourney.getState().setLang('en')
}

// A live change of the OS motion preference should take effect without a
// reload — the journey reads this flag every frame.
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
  useJourney.getState().setReducedMotion(e.matches)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
