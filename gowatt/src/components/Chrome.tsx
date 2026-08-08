import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'
import { useJourney } from '../store/journey'
import { setPreferredTier } from '../lib/capability'

/* ------------------------------------------------------------- loader */

/**
 * Scroll is locked until the scene is ready, so the visitor never scrolls
 * through a journey whose car has not arrived yet.
 */
export function Loader() {
  const { t } = useT()
  const loaded = useJourney((s) => s.loaded)
  const [progress, setProgress] = useState(8)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (loaded) {
      setProgress(100)
      const id = window.setTimeout(() => setDismissed(true), 380)
      return () => window.clearTimeout(id)
    }
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(92, p + Math.random() * 11))
    }, 180)
    return () => window.clearInterval(id)
  }, [loaded])

  useEffect(() => {
    document.body.style.overflow = dismissed ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [dismissed])

  if (dismissed) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      style={{ background: 'var(--bg)' }}
      role="status"
      aria-live="polite"
    >
      <div className="w-72 text-center">
        <img
          src="/brand/logo/gowatt-logo.svg"
          alt="Go Watt"
          width={180}
          height={52}
          className="h-12 w-auto mx-auto mb-6"
        />
        <p className="font-semibold mb-1">{t.loader.title}</p>
        <p className="text-sm text-ink-3 mb-4">{t.loader.hint}</p>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'color-mix(in srgb, var(--text) 12%, transparent)' }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{ width: `${progress}%`, background: 'var(--brand-green)' }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-3 tabular-nums">
          {Math.round(progress)}% {t.loader.percent}
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- header */

export function Header() {
  const { t, lang } = useT()
  const mode = useJourney((s) => s.mode)
  const toggleMode = useJourney((s) => s.toggleMode)
  const setLang = useJourney((s) => s.setLang)
  const percent = useJourney((s) => s.progressPercent)

  return (
    <header
      className="fixed top-0 inset-x-0 z-40"
      style={{ background: 'color-mix(in srgb, var(--bg) 78%, transparent)', backdropFilter: 'blur(10px)' }}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 sm:px-6 h-14">
        <a href="/" className="flex items-center gap-2 shrink-0">
          <img
            src={mode === 'night' ? '/brand/logo/gowatt-logo-orange.png' : '/brand/logo/gowatt-logo.svg'}
            alt="Go Watt"
            width={120}
            height={34}
            className="h-7 w-auto"
          />
        </a>

        <nav className="hidden md:flex items-center gap-4 text-sm ms-4" aria-label={t.nav.home}>
          <a href="#services" className="hover:underline">
            {t.nav.services}
          </a>
          <a href="/about.html" className="hover:underline">
            {t.nav.about}
          </a>
          <a href="/faq.html" className="hover:underline">
            {t.nav.faq}
          </a>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMode}
            aria-label={t.nav.modeLabel}
            aria-pressed={mode === 'night'}
            className="gw-card !p-2 !rounded-full text-base leading-none"
            title={mode === 'night' ? t.nav.dayMode : t.nav.nightMode}
          >
            <span aria-hidden="true">{mode === 'night' ? '☀' : '☾'}</span>
          </button>

          {/* Client-side switch is a convenience; /en is the crawlable page. */}
          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            aria-label={t.nav.langLabel}
            className="gw-card !p-2 !px-3 !rounded-full text-xs font-bold"
          >
            {t.meta.switchTo}
          </button>
        </div>
      </div>

      {/* Journey progress. Purely informative, and labelled for screen readers. */}
      <div
        role="progressbar"
        aria-label={t.a11y.progressLabel}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-0.5"
        style={{ background: 'transparent' }}
      >
        <div
          className="h-full"
          style={{ width: `${percent}%`, background: 'var(--brand-amber)' }}
        />
      </div>
    </header>
  )
}

/* --------------------------------------------------------- sticky CTA */

/**
 * Reachable from any scroll position: nobody who just wants to register should
 * have to complete a 15-scene 3D journey first.
 */
export function StickyCta() {
  const { t } = useT()
  const setRegisterOpen = useJourney((s) => s.setRegisterOpen)
  const percent = useJourney((s) => s.progressPercent)

  // Hidden over the hero, where the primary CTA is already on screen.
  if (percent < 4) return null

  return (
    <button
      type="button"
      onClick={() => setRegisterOpen(true)}
      className="gw-btn fixed z-40 bottom-4 end-4 shadow-lg text-sm"
    >
      <span aria-hidden="true">⚡</span>
      {t.nav.register}
    </button>
  )
}

/* -------------------------------------------------- fallback switcher */

export function TierSwitch({ reason }: { reason: string | null }) {
  const { t } = useT()
  const tier = useJourney((s) => s.tier)

  const label = tier === 'fallback' ? t.fallback.enable : t.fallback.disable

  return (
    <div className="text-xs text-ink-3 flex flex-wrap items-center gap-2">
      {reason && <span>{reason}</span>}
      <button
        type="button"
        className="underline font-semibold"
        onClick={() => {
          setPreferredTier(tier === 'fallback' ? 'full' : 'fallback')
          window.location.reload()
        }}
      >
        {label}
      </button>
    </div>
  )
}

/* -------------------------------------------------------------- footer */

export function Footer() {
  const { t } = useT()
  const year = new Date().getFullYear()

  return (
    <footer
      className="relative z-10 mt-8 pt-10 pb-8"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid gap-8 sm:grid-cols-3">
        <div>
          <img
            src="/brand/logo/gowatt-logo-dark-green.png"
            alt="Go Watt"
            width={150}
            height={44}
            className="h-9 w-auto mb-3"
          />
          <p className="text-sm text-ink-2">{t.footer.tagline}</p>
          <p className="mt-2 text-xs text-ink-3">{t.footer.note}</p>
        </div>

        <nav aria-label={t.footer.pages}>
          <h2 className="text-sm font-bold mb-2">{t.footer.pages}</h2>
          <ul className="space-y-1.5 text-sm">
            <li>
              <a href="/about.html" className="hover:underline">
                {t.nav.about}
              </a>
            </li>
            <li>
              <a href="/faq.html" className="hover:underline">
                {t.nav.faq}
              </a>
            </li>
            <li>
              <a href="/privacy.html" className="hover:underline">
                {t.nav.privacy}
              </a>
            </li>
            <li>
              <a href="/terms.html" className="hover:underline">
                {t.nav.terms}
              </a>
            </li>
            <li>
              <a href="/en/" hrefLang="en" className="hover:underline">
                English
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-bold mb-2">{t.footer.contact}</h2>
          <p className="text-sm text-ink-2">
            <a href="mailto:hello@gowatt.om" className="hover:underline">
              hello@gowatt.om
            </a>
          </p>
        </div>
      </div>

      <p className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 text-xs text-ink-3">
        © {year} Go Watt. {t.footer.rights}
      </p>
    </footer>
  )
}
