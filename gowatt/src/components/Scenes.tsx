import { useT } from '../i18n/useT'
import { SCENE_BY_ID } from '../journey/scenes'
import { useJourney } from '../store/journey'
import { Accordion, Card, ProgressBar, SceneTrack, SimulationNote, StateBadge } from './ui'

/**
 * The overlay layer. Every card here is plain HTML/CSS positioned over the
 * canvas — never 3D text — which is what keeps the journey's content
 * selectable, translatable, crawlable and reachable by a screen reader.
 */

function LogoMark({ className = '' }: { className?: string }) {
  const mode = useJourney((s) => s.mode)
  // Day: the SVG mark, which was drawn for light grounds. Night: the orange
  // variant, the only existing dark-safe logo file in the brand folder.
  const src = mode === 'night' ? '/brand/logo/gowatt-logo-orange.png' : '/brand/logo/gowatt-logo.svg'
  return <img src={src} alt="Go Watt" className={className} width={168} height={48} />
}

/* --------------------------------------------------------------- 1. hero */

function Hero() {
  const { t } = useT()
  const setRegisterOpen = useJourney((s) => s.setRegisterOpen)

  return (
    <SceneTrack id="hero" vh={SCENE_BY_ID.hero.vh} labelledBy="hero-title">
      <div className="max-w-xl" data-reveal>
        <LogoMark className="h-11 w-auto mb-6" />
        <p className="gw-card__eyebrow mb-2">{t.hero.eyebrow}</p>
        {/* The LCP element is this heading, not the canvas — it paints before
            any 3D work has started. */}
        <h1 id="hero-title" className="text-4xl sm:text-5xl font-extrabold mb-4">
          {t.hero.title}
        </h1>
        <p className="text-lg text-ink-2 mb-6">{t.hero.body}</p>

        <p className="gw-chip mb-6">
          <span aria-hidden="true">🚧</span>
          {t.badge.development}
        </p>

        <div className="flex flex-wrap gap-3">
          <button type="button" className="gw-btn" onClick={() => setRegisterOpen(true)}>
            {t.hero.cta}
          </button>
          <a href="#services" className="gw-btn gw-btn--ghost">
            {t.hero.ctaSecondary}
          </a>
        </div>

        <p className="mt-10 text-sm text-ink-3 flex items-center gap-2">
          <span aria-hidden="true">↓</span>
          {t.hero.scrollHint}
        </p>
      </div>
    </SceneTrack>
  )
}

/* ------------------------------------------------- 2–5. how it works */

function Login() {
  const { t } = useT()
  const s = t.scenes.login
  return (
    <SceneTrack id="login" vh={SCENE_BY_ID.login.vh} labelledBy="login-title">
      <div className="flex justify-start">
        <Card eyebrow={s.eyebrow} title={s.title} body={s.body} titleId="login-title">
          <div className="gw-sim mt-4 space-y-2" aria-hidden="true">
            <div className="text-xs font-semibold text-ink-3">{s.fields.phone}</div>
            <div className="gw-input text-ink-3 text-sm">{s.placeholderPhone}</div>
            <div className="flex gap-2 pt-1">
              <span className="gw-btn text-xs px-3 py-1.5">{s.fields.email}</span>
              <span className="gw-btn gw-btn--ghost text-xs px-3 py-1.5">{s.fields.apple}</span>
            </div>
          </div>
          <SimulationNote className="mt-3" />
        </Card>
      </div>
    </SceneTrack>
  )
}

function Profile() {
  const { t } = useT()
  const s = t.scenes.profile
  return (
    <SceneTrack id="profile" vh={SCENE_BY_ID.profile.vh} labelledBy="profile-title">
      <Card eyebrow={s.eyebrow} title={s.title} body={s.body} titleId="profile-title">
        <dl className="gw-sim mt-4 text-sm space-y-2">
          {[
            [s.model, s.modelValue],
            [s.plug, s.plugValue],
            [s.capacity, s.capacityValue],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-ink-3">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <SimulationNote className="mt-3" />
      </Card>
    </SceneTrack>
  )
}

function FindStation() {
  const { t } = useT()
  const s = t.scenes.find
  const states: [string, string][] = [
    [s.pinAvailable, 'var(--brand-green)'],
    [s.pinBusy, 'var(--brand-amber)'],
    [s.pinService, 'var(--text-3)'],
  ]
  return (
    <SceneTrack id="find" vh={SCENE_BY_ID.find.vh} labelledBy="find-title">
      <div className="flex justify-start">
        <Card eyebrow={s.eyebrow} title={s.title} body={s.body} titleId="find-title">
          <ul className="gw-sim mt-4 space-y-2 text-sm">
            {states.map(([label, color]) => (
              <li key={label} className="flex items-center gap-2">
                {/* Shape + text label, so the legend does not depend on colour. */}
                <span
                  aria-hidden="true"
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: color }}
                />
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.72rem] text-ink-3">{s.note}</p>
          <SimulationNote className="mt-2" />
        </Card>
      </div>
    </SceneTrack>
  )
}

function Booking() {
  const { t } = useT()
  const s = t.scenes.book
  return (
    <SceneTrack id="book" vh={SCENE_BY_ID.book.vh} labelledBy="book-title">
      <Card eyebrow={s.eyebrow} title={s.title} body={s.body} titleId="book-title">
        <div className="gw-sim mt-4" aria-hidden="true">
          <p className="text-xs font-semibold text-ink-3 mb-2">{s.today}</p>
          <div className="grid grid-cols-4 gap-2">
            {s.slots.map((slot, i) => (
              <span
                key={slot}
                className="text-center text-xs py-1.5 rounded-lg font-semibold"
                style={
                  i === 1
                    ? { background: 'var(--brand-green)', color: '#fff' }
                    : { border: '1px solid var(--border)', color: 'var(--text-2)' }
                }
              >
                {slot}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {s.selected}: <strong>{s.slots[1]}</strong>
          </p>
        </div>
        <SimulationNote className="mt-3" />
      </Card>
    </SceneTrack>
  )
}

/* ----------------------------------------------------- 6. fast charging */

function Charging() {
  const { t } = useT()
  const s = t.scenes.charge
  const charge = useJourney((st) => st.chargePercent)
  const done = charge >= 100

  return (
    <SceneTrack id="charge" vh={SCENE_BY_ID.charge.vh} labelledBy="charge-title">
      <div className="flex justify-start">
        <Card eyebrow={s.eyebrow} title={s.title} body={s.body} titleId="charge-title">
          <div className="mt-4 space-y-3">
            <StateBadge
              state={done ? 'complete' : 'charging'}
              label={done ? s.stateComplete : s.stateCharging}
            />
            {/* The percentage is driven by scroll position inside this beat. */}
            <ProgressBar
              value={charge}
              label={t.a11y.chargeLabel}
              state={done ? 'complete' : 'charging'}
            />
            <dl className="text-sm space-y-1">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">{s.power}</dt>
                <dd className="font-semibold">{s.powerValue}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">{s.energy}</dt>
                {/* Tied to scroll, like the percentage above — never a static
                    "fact" about a real session, just the same illustrative
                    number scaled to a typical ~42 kWh battery. */}
                <dd className="font-semibold tabular-nums">
                  {Math.round((charge / 100) * 42)} kWh
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">{s.eta}</dt>
                <dd className="font-semibold tabular-nums">
                  {Math.max(0, Math.round((100 - charge) * 0.32))} min
                </dd>
              </div>
            </dl>
          </div>
          <SimulationNote className="mt-3" />
        </Card>
      </div>
    </SceneTrack>
  )
}

/* --------------------------------------------------------- 7. payment */

function Payment() {
  const { t } = useT()
  const s = t.scenes.pay
  return (
    <SceneTrack id="pay" vh={SCENE_BY_ID.pay.vh} labelledBy="pay-title">
      <Card eyebrow={s.eyebrow} title={s.title} body={s.body} titleId="pay-title">
        <div className="gw-sim mt-4 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid place-items-center w-9 h-9 rounded-xl text-lg"
            style={{ background: 'color-mix(in srgb, var(--brand-green) 15%, transparent)' }}
          >
            👛
          </span>
          <div className="text-sm">
            <p className="font-semibold">{s.wallet}</p>
            <p className="text-ink-3">
              {s.amount}: {s.amountValue}
            </p>
          </div>
          <span className="ms-auto gw-chip" style={{ color: 'var(--brand-green-strong)' }}>
            <span aria-hidden="true">✓</span>
            {s.done}
          </span>
        </div>
        <SimulationNote className="mt-3" />
      </Card>
    </SceneTrack>
  )
}

/* -------------------------------------------------------- 8. services */

function Services() {
  const { t } = useT()
  const s = t.scenes.services
  return (
    <SceneTrack id="services" vh={SCENE_BY_ID.services.vh} labelledBy="services-title">
      <div id="services" className="scroll-mt-24">
        <div data-reveal className="max-w-xl mb-8">
          <p className="gw-card__eyebrow mb-1.5">{s.eyebrow}</p>
          <h2 id="services-title" className="text-3xl font-bold mb-2">
            {s.title}
          </h2>
          <p className="text-ink-2">{s.body}</p>
        </div>
        {/* Capped at half the viewport so the service props beside the road
            stay visible rather than being covered by their own captions. */}
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          {s.items.map((item, i) => (
            <div key={item.title} data-reveal className="gw-card">
              <p className="gw-card__eyebrow mb-1">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="text-lg font-bold mb-1.5">{item.title}</h3>
              <p className="text-ink-2 text-[0.92rem]">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </SceneTrack>
  )
}

/* -------------------------------------------------------- 9. coverage */

function Coverage() {
  const { t } = useT()
  const s = t.scenes.coverage
  return (
    <SceneTrack id="coverage" vh={SCENE_BY_ID.coverage.vh} labelledBy="coverage-title">
      <div className="flex justify-start">
        <Card eyebrow={s.eyebrow} title={s.title} body={s.body} titleId="coverage-title">
          {/* All 11 Omani governorates — the real, complete list, not just the
              handful of cities a marketing map usually shows. */}
          <ul className="mt-4 flex flex-wrap gap-2">
            {s.regions.map((region) => (
              <li
                key={region.name}
                className="gw-chip"
                style={
                  region.planned
                    ? {
                        background: 'color-mix(in srgb, var(--brand-green) 14%, transparent)',
                        color: 'var(--brand-green-strong)',
                      }
                    : undefined
                }
              >
                <span aria-hidden="true">{region.planned ? '●' : '○'}</span>
                {region.name}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.72rem] text-ink-3">
            ● {s.legendPlanned} — ○ {s.legendStudy}
          </p>
        </Card>
      </div>
    </SceneTrack>
  )
}

/* ------------------------------------------------- 10. points & tiers */

function Points() {
  const { t } = useT()
  const s = t.scenes.points
  return (
    <SceneTrack id="points" vh={SCENE_BY_ID.points.vh} labelledBy="points-title">
      <div>
        <div data-reveal className="max-w-xl mb-8">
          <p className="gw-card__eyebrow mb-1.5">{s.eyebrow}</p>
          <h2 id="points-title" className="text-3xl font-bold mb-2">
            {s.title}
          </h2>
          <p className="text-ink-2">{s.body}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 max-w-2xl">
          {s.tiers.map((tier, i) => (
            <div key={tier.name} data-reveal className="gw-card">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <span
                  className="gw-chip !py-0.5 !px-2 text-[0.66rem]"
                  style={i === 2 ? { color: 'var(--amber-text-safe)' } : undefined}
                >
                  {tier.threshold}
                </span>
              </div>
              <p className="text-ink-2 text-[0.92rem] mb-3">{tier.body}</p>
              <ul className="space-y-1 mb-3 text-[0.78rem]">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
                    <span aria-hidden="true" style={{ color: 'var(--brand-green)' }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {/* Screenshot placeholder — real app captures drop in here once
                  the app UI is final. Never a fabricated screenshot. */}
              <div
                className="rounded-xl grid place-items-center text-[0.68rem] text-center px-2 py-3"
                style={{
                  border: '1px dashed var(--border)',
                  color: 'var(--text-3)',
                  aspectRatio: '16 / 9',
                  background: i === 2 ? 'color-mix(in srgb, var(--brand-amber) 8%, transparent)' : undefined,
                }}
              >
                {s.shot}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SceneTrack>
  )
}

/* ---------------------------------------------------- 11. app download */

function Download() {
  const { t } = useT()
  const s = t.scenes.download
  const mode = useJourney((st) => st.mode)
  return (
    <SceneTrack id="download" vh={SCENE_BY_ID.download.vh} align="center" labelledBy="download-title">
      <div className="mx-auto text-center max-w-lg" data-reveal>
        <p className="gw-card__eyebrow mb-1.5">{s.eyebrow}</p>
        <h2 id="download-title" className="text-3xl font-bold mb-2">
          {s.title}
        </h2>
        <p className="text-ink-2 mb-6">{s.body}</p>
        <div className="flex flex-wrap gap-3 justify-center">
          {/* Disabled on purpose: the app is not published, so these must not
              look like working store links. */}
          <span className="gw-card flex items-center gap-2 !py-2.5 !px-4 text-sm font-semibold opacity-80">
            <img
              src={
                mode === 'night'
                  ? '/brand/icon/Apple icon white-01.svg'
                  : '/brand/icon/Apple icon Black-01.svg'
              }
              alt=""
              width={18}
              height={18}
              aria-hidden="true"
            />
            {s.appStore}
          </span>
          <span className="gw-card flex items-center gap-2 !py-2.5 !px-4 text-sm font-semibold opacity-80">
            <span aria-hidden="true">▶</span>
            {s.googlePlay}
          </span>
        </div>
      </div>
    </SceneTrack>
  )
}

/* ----------------------------------------------------------- 12. about */

function About() {
  const { t } = useT()
  const s = t.scenes.about
  return (
    <SceneTrack id="about" vh={SCENE_BY_ID.about.vh} labelledBy="about-title">
      <Card
        eyebrow={s.eyebrow}
        title={s.title}
        body={s.body}
        titleId="about-title"
        className="!max-w-2xl"
      >
        {/* The full About text lives on a canvas-free page — faster and
            properly crawlable. This beat is the pointer to it. */}
        <a href="/about.html" className="gw-btn gw-btn--ghost mt-4 text-sm">
          {s.more}
        </a>
      </Card>
    </SceneTrack>
  )
}

/* ------------------------------------------------------------- 13. FAQ */

function Faq() {
  const { t } = useT()
  const s = t.scenes.faq
  return (
    <SceneTrack id="faq" vh={SCENE_BY_ID.faq.vh} align="center" labelledBy="faq-title">
      <div className="mx-auto max-w-2xl w-full">
        <div data-reveal className="mb-4">
          <p className="gw-card__eyebrow mb-1.5">{s.eyebrow}</p>
          <h2 id="faq-title" className="text-3xl font-bold">
            {s.title}
          </h2>
        </div>
        <div data-reveal className="gw-card">
          <Accordion items={s.items} />
        </div>
        <a href="/faq.html" className="gw-btn gw-btn--ghost mt-4 text-sm">
          {s.more}
        </a>
      </div>
    </SceneTrack>
  )
}

/* ---------------------------------------------------------- 14. finale */

function Finale() {
  const { t } = useT()
  const s = t.scenes.finale
  const complete = useJourney((st) => st.complete)
  const charge = useJourney((st) => st.chargePercent)
  const setRegisterOpen = useJourney((st) => st.setRegisterOpen)
  const battery = complete ? 100 : charge

  return (
    <SceneTrack id="finale" vh={SCENE_BY_ID.finale.vh} align="center" labelledBy="finale-title">
      <div className="mx-auto max-w-xl text-center" data-reveal>
        <StateBadge
          state={complete ? 'complete' : 'charging'}
          label={complete ? s.eyebrow : t.scenes.charge.stateCharging}
        />
        <h2 id="finale-title" className="text-4xl font-extrabold mt-4 mb-3">
          {s.title}
        </h2>
        <p className="text-ink-2 mb-6">{s.body}</p>

        <div className="gw-card text-start mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">{s.battery}</span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: complete ? 'var(--brand-green-strong)' : 'var(--amber-text-safe)' }}
            >
              {battery}%
            </span>
          </div>
          <ProgressBar
            value={battery}
            label={t.a11y.chargeLabel}
            state={complete ? 'complete' : 'charging'}
          />
        </div>

        <button type="button" className="gw-btn" onClick={() => setRegisterOpen(true)}>
          {s.cta}
        </button>
      </div>
    </SceneTrack>
  )
}

export function Scenes() {
  return (
    <>
      <Hero />
      <Login />
      <Profile />
      <FindStation />
      <Booking />
      <Charging />
      <Payment />
      <Services />
      <Coverage />
      <Points />
      <Download />
      <About />
      <Faq />
      <Finale />
    </>
  )
}
