import { useT } from '../i18n/useT'
import { useJourney } from '../store/journey'
import { Accordion } from './ui'
import { TierSwitch } from './Chrome'
import type { FallbackReason } from '../lib/capability'

/**
 * THE NO-WEBGL JOURNEY
 *
 * Not a stripped-down apology page: the same fourteen beats, in the same
 * order, with the same copy — drawn as inline SVG illustrations instead of a
 * WebGL scene. This is what a slow 3G connection, a two-core Android, a
 * WebGL-less browser, and anyone with prefers-reduced-motion actually gets,
 * and it is a complete experience on its own terms.
 *
 * Illustrations are inline SVG: no image requests, no layout shift, and they
 * inherit the day/night tokens automatically.
 */

function RoadIllustration({ state }: { state: 'idle' | 'driving' | 'charging' | 'complete' }) {
  const accent =
    state === 'complete'
      ? 'var(--state-complete)'
      : state === 'charging'
        ? 'var(--state-charging)'
        : 'var(--brand-green)'

  return (
    <svg viewBox="0 0 320 130" role="img" aria-hidden="true" className="w-full h-auto">
      <rect x="0" y="86" width="320" height="44" fill="var(--road-asphalt)" rx="6" />
      {[10, 60, 110, 160, 210, 260].map((x) => (
        <rect key={x} x={x} y="106" width="26" height="4" fill="var(--road-centerline)" rx="2" />
      ))}
      {/* Generic EV crossover silhouette — same design intent as the 3D model. */}
      <g transform="translate(96 44)">
        <path
          d="M6 34 C6 22 18 18 30 17 L44 6 C48 2 54 0 62 0 L92 0 C100 0 106 3 110 8 L120 17 C132 18 142 22 142 34 L142 42 C142 45 140 47 137 47 L11 47 C8 47 6 45 6 42 Z"
          fill="var(--surface)"
          stroke="var(--text-3)"
          strokeWidth="1.5"
        />
        <path d="M50 8 L104 8 L114 18 L42 18 Z" fill="var(--text)" opacity="0.75" />
        <rect x="8" y="26" width="130" height="4" fill={accent} rx="2" />
        <circle cx="36" cy="47" r="9" fill="var(--text)" />
        <circle cx="112" cy="47" r="9" fill="var(--text)" />
        {(state === 'charging' || state === 'complete') && (
          <circle cx="14" cy="24" r="5" fill={accent} />
        )}
      </g>
      {state === 'charging' || state === 'complete' ? (
        <g transform="translate(250 40)">
          <rect x="0" y="10" width="16" height="46" rx="4" fill="var(--surface)" stroke="var(--text-3)" />
          <rect x="4" y="16" width="8" height="10" rx="2" fill={accent} />
          <path d="M16 30 L34 30 L34 62" stroke="var(--text)" strokeWidth="2.5" fill="none" />
        </g>
      ) : null}
    </svg>
  )
}

function Beat({
  n,
  eyebrow,
  title,
  body,
  children,
  illustration,
}: {
  n: number
  eyebrow: string
  title: string
  body: string
  children?: React.ReactNode
  illustration?: 'idle' | 'driving' | 'charging' | 'complete'
}) {
  return (
    <section className="py-10 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="grid gap-6 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div>
          <p className="gw-card__eyebrow mb-1.5">
            {String(n).padStart(2, '0')} — {eyebrow}
          </p>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-ink-2">{body}</p>
          {children}
        </div>
        {illustration && (
          <div className="gw-card">
            <RoadIllustration state={illustration} />
          </div>
        )}
      </div>
    </section>
  )
}

export function Fallback2D({ reason }: { reason: FallbackReason }) {
  const { t } = useT()
  const s = t.scenes
  const setRegisterOpen = useJourney((st) => st.setRegisterOpen)
  const reasonText = reason ? t.fallback.reason[reason] : null

  return (
    <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16">
      <div className="gw-card mb-8">
        <h2 className="font-bold mb-1">{t.fallback.title}</h2>
        <p className="text-sm text-ink-2 mb-2">{t.fallback.body}</p>
        <TierSwitch reason={reasonText} />
      </div>

      <header className="pb-8">
        <img
          src="/brand/logo/gowatt-logo.svg"
          alt="Go Watt"
          width={180}
          height={52}
          className="h-11 w-auto mb-5"
        />
        <p className="gw-card__eyebrow mb-2">{t.hero.eyebrow}</p>
        <h1 className="text-4xl font-extrabold mb-3">{t.hero.title}</h1>
        <p className="text-lg text-ink-2 mb-5">{t.hero.body}</p>
        <p className="gw-chip mb-5">
          <span aria-hidden="true">🚧</span>
          {t.badge.development}
        </p>
        <button type="button" className="gw-btn" onClick={() => setRegisterOpen(true)}>
          {t.hero.cta}
        </button>
      </header>

      <Beat n={2} eyebrow={s.login.eyebrow} title={s.login.title} body={s.login.body} illustration="idle" />
      <Beat n={3} eyebrow={s.profile.eyebrow} title={s.profile.title} body={s.profile.body} />
      <Beat n={4} eyebrow={s.find.eyebrow} title={s.find.title} body={s.find.body} illustration="driving" />
      <Beat n={5} eyebrow={s.book.eyebrow} title={s.book.title} body={s.book.body} />
      <Beat
        n={6}
        eyebrow={s.charge.eyebrow}
        title={s.charge.title}
        body={s.charge.body}
        illustration="charging"
      >
        <p className="gw-chip mt-4" style={{ color: 'var(--amber-text-safe)' }}>
          <span aria-hidden="true">⚡</span>
          {s.charge.stateCharging}
        </p>
      </Beat>
      <Beat n={7} eyebrow={s.pay.eyebrow} title={s.pay.title} body={s.pay.body} />

      <section className="py-10 border-t" id="services" style={{ borderColor: 'var(--border)' }}>
        <p className="gw-card__eyebrow mb-1.5">08 — {s.services.eyebrow}</p>
        <h2 className="text-2xl font-bold mb-2">{s.services.title}</h2>
        <p className="text-ink-2 mb-6">{s.services.body}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {s.services.items.map((item) => (
            <div key={item.title} className="gw-card">
              <h3 className="font-bold mb-1.5">{item.title}</h3>
              <p className="text-ink-2 text-[0.92rem]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Beat n={9} eyebrow={s.coverage.eyebrow} title={s.coverage.title} body={s.coverage.body}>
        <ul className="mt-4 flex flex-wrap gap-2">
          {s.coverage.cities.map((city, i) => (
            <li key={city} className="gw-chip">
              <span aria-hidden="true">{i < 3 ? '●' : '○'}</span>
              {city}
            </li>
          ))}
        </ul>
      </Beat>

      <section className="py-10 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="gw-card__eyebrow mb-1.5">10 — {s.points.eyebrow}</p>
        <h2 className="text-2xl font-bold mb-2">{s.points.title}</h2>
        <p className="text-ink-2 mb-6">{s.points.body}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {s.points.tiers.map((tier) => (
            <div key={tier.name} className="gw-card">
              <h3 className="font-bold mb-1">{tier.name}</h3>
              <p className="text-ink-2 text-[0.92rem]">{tier.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Beat n={11} eyebrow={s.download.eyebrow} title={s.download.title} body={s.download.body}>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="gw-card !py-2 !px-3 text-sm font-semibold opacity-80">{s.download.appStore}</span>
          <span className="gw-card !py-2 !px-3 text-sm font-semibold opacity-80">
            {s.download.googlePlay}
          </span>
        </div>
      </Beat>

      <Beat n={12} eyebrow={s.about.eyebrow} title={s.about.title} body={s.about.body}>
        <a href="/about.html" className="gw-btn gw-btn--ghost mt-4 text-sm">
          {s.about.more}
        </a>
      </Beat>

      <section className="py-10 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="gw-card__eyebrow mb-1.5">13 — {s.faq.eyebrow}</p>
        <h2 className="text-2xl font-bold mb-4">{s.faq.title}</h2>
        <div className="gw-card">
          <Accordion items={s.faq.items} />
        </div>
        <a href="/faq.html" className="gw-btn gw-btn--ghost mt-4 text-sm">
          {s.faq.more}
        </a>
      </section>

      <section className="py-12 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="gw-chip mb-4" style={{ color: 'var(--brand-green-strong)' }}>
          <span aria-hidden="true">✓</span>
          {s.finale.eyebrow}
        </p>
        <h2 className="text-3xl font-extrabold mb-3">{s.finale.title}</h2>
        <p className="text-ink-2 mb-6">{s.finale.body}</p>
        <div className="max-w-xs mx-auto mb-6">
          <RoadIllustration state="complete" />
        </div>
        <button type="button" className="gw-btn" onClick={() => setRegisterOpen(true)}>
          {s.finale.cta}
        </button>
      </section>
    </main>
  )
}
