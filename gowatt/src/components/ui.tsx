import { useId, useState, type ReactNode } from 'react'
import { useT } from '../i18n/useT'

/** Wrapper for one journey beat: a full-height track the ScrollTrigger keys off. */
export function SceneTrack({
  id,
  vh,
  children,
  align = 'start',
  labelledBy,
}: {
  id: string
  vh: number
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  labelledBy?: string
}) {
  const justify =
    align === 'center' ? 'justify-center' : align === 'end' ? 'justify-end' : 'justify-start'
  return (
    <section
      data-scene={id}
      aria-labelledby={labelledBy}
      style={{ minHeight: `${vh}svh` }}
      className={`gw-scene ${justify}`}
    >
      <div className="w-full max-w-6xl mx-auto">{children}</div>
    </section>
  )
}

/**
 * Every card that depicts an unreleased feature carries this banner.
 * It is textual, not just visual, so the "this isn't live" framing survives
 * a screen reader, a high-contrast mode and a printout alike.
 */
export function SimulationNote({ className = '' }: { className?: string }) {
  const { t } = useT()
  return (
    <p className={`text-[0.72rem] leading-snug text-ink-3 flex gap-1.5 items-start ${className}`}>
      <span aria-hidden="true">ⓘ</span>
      <span>{t.badge.simulation}</span>
    </p>
  )
}

export function Card({
  eyebrow,
  title,
  body,
  children,
  className = '',
  titleId,
  as: As = 'h2',
}: {
  eyebrow?: string
  title?: string
  body?: string
  children?: ReactNode
  className?: string
  titleId?: string
  as?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <div data-reveal className={`gw-card max-w-card ${className}`}>
      {eyebrow && <p className="gw-card__eyebrow mb-1.5">{eyebrow}</p>}
      {title && (
        <As id={titleId} className="text-xl sm:text-2xl font-bold mb-2">
          {title}
        </As>
      )}
      {body && <p className="text-ink-2 text-[0.95rem]">{body}</p>}
      {children}
    </div>
  )
}

/**
 * Charge/state readout. The colour is always paired with an icon and a text
 * label, so charge state is never encoded by colour alone.
 */
export function StateBadge({
  state,
  label,
}: {
  state: 'charging' | 'complete'
  label: string
}) {
  const complete = state === 'complete'
  return (
    <span
      className="gw-chip"
      style={{
        background: complete
          ? 'color-mix(in srgb, var(--state-complete) 16%, transparent)'
          : 'color-mix(in srgb, var(--state-charging) 18%, transparent)',
        color: complete ? 'var(--brand-green-strong)' : 'var(--amber-text-safe)',
      }}
    >
      <span aria-hidden="true">{complete ? '✓' : '⚡'}</span>
      {label}
    </span>
  )
}

export function ProgressBar({
  value,
  label,
  state,
}: {
  value: number
  label: string
  state: 'charging' | 'complete'
}) {
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: 'color-mix(in srgb, var(--text) 10%, transparent)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-150 ease-out"
          style={{
            width: `${value}%`,
            background:
              state === 'complete' ? 'var(--state-complete)' : 'var(--state-charging)',
          }}
        />
      </div>
      <p className="mt-1.5 text-sm font-bold tabular-nums" style={{ color: 'var(--text-2)' }}>
        {value}%
      </p>
    </div>
  )
}

/** FAQ accordion using the grid-template-rows technique (see index.css). */
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  const baseId = useId()

  return (
    <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {items.map((item, i) => {
        const isOpen = open === i
        const panelId = `${baseId}-panel-${i}`
        const buttonId = `${baseId}-button-${i}`
        return (
          <li key={item.q}>
            <h3 className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full text-start py-3.5 flex items-center justify-between gap-3 font-semibold"
                style={{ color: 'var(--text)' }}
              >
                <span>{item.q}</span>
                <span
                  aria-hidden="true"
                  className="shrink-0 transition-transform duration-200"
                  style={{
                    transform: isOpen ? 'rotate(45deg)' : 'none',
                    color: 'var(--brand-green)',
                  }}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className="gw-acc__panel"
              data-open={isOpen}
            >
              <div>
                <p className="pb-4 text-ink-2 text-[0.95rem]">{item.a}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
