import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/useT'
import { useJourney } from '../store/journey'
import { setPreferredTier } from '../lib/capability'
import { SCENES } from '../journey/scenes'

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

/** Index into SCENES of the first scene whose id matches, or -1. */
const servicesIndex = SCENES.findIndex((s) => s.id === 'services')

/**
 * Nav link with an animated underline. Scaled from the centre (not a fixed
 * edge) so it looks identical under RTL and LTR without a mirrored variant.
 */
function NavLink({
  href,
  active,
  onClick,
  className = '',
  children,
}: {
  href: string
  active?: boolean
  onClick?: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`relative py-1 transition-colors ${className}`}
      style={{ color: active ? 'var(--brand-green-strong)' : 'var(--text-2)' }}
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-0.5 h-[1.5px] rounded-full origin-center transition-transform duration-300"
        style={{
          background: 'var(--brand-green)',
          transform: active ? 'scaleX(1)' : 'scaleX(0)',
        }}
      />
    </a>
  )
}

function ModeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useT()
  const mode = useJourney((s) => s.mode)
  const toggleMode = useJourney((s) => s.toggleMode)
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={t.nav.modeLabel}
      aria-pressed={mode === 'night'}
      className={compact ? 'gw-card !p-2 !rounded-full text-base leading-none' : 'gw-card flex items-center gap-2 text-sm font-semibold'}
      title={mode === 'night' ? t.nav.dayMode : t.nav.nightMode}
    >
      <span aria-hidden="true">{mode === 'night' ? '☀' : '☾'}</span>
      {!compact && <span>{mode === 'night' ? t.nav.dayMode : t.nav.nightMode}</span>}
    </button>
  )
}

function LangToggle({ compact = false }: { compact?: boolean }) {
  const { t, lang } = useT()
  const setLang = useJourney((s) => s.setLang)
  return (
    // Client-side switch is a convenience; /en is the crawlable page.
    <button
      type="button"
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      aria-label={t.nav.langLabel}
      className={compact ? 'gw-card !p-2 !px-3 !rounded-full text-xs font-bold' : 'gw-card text-sm font-semibold'}
    >
      {t.meta.switchTo}
    </button>
  )
}

export function Header() {
  const { t } = useT()
  const percent = useJourney((s) => s.progressPercent)
  const scene = useJourney((s) => s.scene)
  const setRegisterOpen = useJourney((s) => s.setRegisterOpen)

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  // Scroll elevation: a flat header over the hero, a grounded one once the
  // page has actually moved — the standard "modern nav" tell.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scrollspy: of the three nav links, only "services" is an in-page anchor
  // (about/faq are separate canvas-free pages), so that's the only one that
  // can honestly reflect "you are here" — highlighted once the visitor has
  // scrolled to or past that beat.
  const servicesActive = servicesIndex >= 0 && scene >= servicesIndex

  // Mobile drawer: focus trap + Escape + overlay click, mirroring the
  // register dialog's pattern so keyboard users get the same guarantees.
  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      menuBtnRef.current?.focus()
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className="fixed top-0 inset-x-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300"
      style={{
        background: scrolled
          ? 'color-mix(in srgb, var(--bg) 88%, transparent)'
          : 'color-mix(in srgb, var(--bg) 55%, transparent)',
        backdropFilter: scrolled ? 'blur(14px)' : 'blur(6px)',
        boxShadow: scrolled ? '0 1px 0 var(--border), 0 10px 30px -22px rgb(11 21 18 / 0.22)' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 sm:px-6 h-14">
        <a href="/" className="flex items-center gap-2 shrink-0">
          <LogoImg />
        </a>

        <nav className="hidden md:flex items-center gap-5 text-sm ms-4 font-medium" aria-label={t.nav.home}>
          <NavLink href="#services" active={servicesActive}>
            {t.nav.services}
          </NavLink>
          <NavLink href="/about.html">{t.nav.about}</NavLink>
          <NavLink href="/faq.html">{t.nav.faq}</NavLink>
        </nav>

        <div className="ms-auto hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1.5 pe-2 border-e" style={{ borderColor: 'var(--border)' }}>
            <ModeToggle compact />
            <LangToggle compact />
          </div>
          <button type="button" className="gw-btn text-sm" onClick={() => setRegisterOpen(true)}>
            {t.nav.register}
          </button>
        </div>

        {/* Mobile: a real hamburger + drawer, where before there was nothing
            here at all once the desktop links were hidden. */}
        <div className="ms-auto flex md:hidden items-center gap-2">
          <ModeToggle compact />
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t.nav.menu}
            aria-expanded={menuOpen}
            className="gw-card !p-2 !rounded-full"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
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
        <div className="h-full transition-[width]" style={{ width: `${percent}%`, background: 'var(--brand-amber)' }} />
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ background: 'rgb(10 15 13 / 0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMenu()
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.nav.home}
            className="absolute top-14 inset-x-4 gw-card flex flex-col gap-1"
          >
            <NavLink href="#services" active={servicesActive} onClick={closeMenu} className="!py-2.5">
              {t.nav.services}
            </NavLink>
            <NavLink href="/about.html" onClick={closeMenu} className="!py-2.5">
              {t.nav.about}
            </NavLink>
            <NavLink href="/faq.html" onClick={closeMenu} className="!py-2.5">
              {t.nav.faq}
            </NavLink>
            <hr className="my-1" style={{ borderColor: 'var(--border)' }} />
            <div className="flex items-center gap-2 py-1">
              <ModeToggle />
              <LangToggle />
            </div>
            <button
              type="button"
              className="gw-btn mt-1"
              onClick={() => {
                closeMenu()
                setRegisterOpen(true)
              }}
            >
              {t.nav.register}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

function LogoImg() {
  const mode = useJourney((s) => s.mode)
  return (
    <img
      src={mode === 'night' ? '/brand/logo/gowatt-logo-orange.png' : '/brand/logo/gowatt-logo.svg'}
      alt="Go Watt"
      width={120}
      height={34}
      className="h-7 w-auto"
    />
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
