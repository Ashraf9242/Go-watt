import { useEffect, useId, useRef, useState } from 'react'
import { useT } from '../i18n/useT'
import { useJourney } from '../store/journey'
import { isEmail, isPhone, submitForm, TURNSTILE_SITE_KEY, type FormKind } from '../lib/submit'

type Errors = Record<string, string>

/**
 * The waitlist and home-charger-sharing forms.
 *
 * Both are real: validated client-side, submitted through the single adapter
 * in lib/submit.ts, and never told the visitor "sent" unless the transport
 * actually confirmed it.
 */
function FormFields({
  kind,
  onDone,
}: {
  kind: FormKind
  onDone: (message: string) => void
}) {
  const { t } = useT()
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const baseId = useId()

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  function validate(): Errors {
    const next: Errors = {}
    if (!values.name?.trim()) next.name = t.forms.errorRequired
    if (!values.email?.trim()) next.email = t.forms.errorRequired
    else if (!isEmail(values.email)) next.email = t.forms.errorEmail

    if (kind === 'investor') {
      if (!values.phone?.trim()) next.phone = t.forms.errorRequired
      else if (!isPhone(values.phone)) next.phone = t.forms.errorPhone
      if (!values.city?.trim()) next.city = t.forms.errorRequired
    }
    if (values.consent !== 'yes') next.consent = t.forms.errorRequired
    return next
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Move focus to the first problem so keyboard users are not stranded.
      const first = Object.keys(found)[0]
      document.getElementById(`${baseId}-${first}`)?.focus()
      return
    }

    setSending(true)
    setNotice(null)
    const token = (document.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value) ?? undefined
    const result = await submitForm(kind, { ...values, lang: document.documentElement.lang }, token)
    setSending(false)

    if (result.status === 'sent') {
      onDone(kind === 'waitlist' ? t.forms.successWaitlist : t.forms.successInvestor)
    } else if (result.status === 'queued') {
      // Honest about what happened: stored locally, backend not connected yet.
      setNotice(
        document.documentElement.lang === 'ar'
          ? 'حُفظ الطلب محلياً — لم يُربط الخادم بعد (VITE_FORMS_ENDPOINT).'
          : 'Saved locally — the backend endpoint is not configured yet (VITE_FORMS_ENDPOINT).',
      )
    } else {
      setNotice(t.forms.errorGeneric)
    }
  }

  const field = (
    key: string,
    label: string,
    type = 'text',
    required = true,
    textarea = false,
  ) => (
    <div>
      <label htmlFor={`${baseId}-${key}`} className="block text-sm font-semibold mb-1">
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: 'var(--amber-text-safe)' }}>
            {' '}
            *
          </span>
        )}
      </label>
      {textarea ? (
        <textarea
          id={`${baseId}-${key}`}
          className="gw-input"
          rows={3}
          value={values[key] ?? ''}
          onChange={set(key)}
          aria-invalid={Boolean(errors[key])}
          aria-describedby={errors[key] ? `${baseId}-${key}-err` : undefined}
        />
      ) : (
        <input
          id={`${baseId}-${key}`}
          type={type}
          className="gw-input"
          value={values[key] ?? ''}
          onChange={set(key)}
          required={required}
          aria-invalid={Boolean(errors[key])}
          aria-describedby={errors[key] ? `${baseId}-${key}-err` : undefined}
        />
      )}
      {errors[key] && (
        <p id={`${baseId}-${key}-err`} className="mt-1 text-xs" style={{ color: '#b42318' }}>
          {errors[key]}
        </p>
      )}
    </div>
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <p className="text-sm text-ink-2">
        {kind === 'waitlist' ? t.forms.waitlistBody : t.forms.investorBody}
      </p>

      {/* Investor context: what sharing a home charger is planned to involve,
          before asking anyone to fill in their details. Every figure here is
          explicitly labelled illustrative/estimated — none of it is a live
          number, since the programme hasn't opened yet. */}
      {kind === 'investor' && (
        <div className="gw-sim space-y-3">
          <ul className="space-y-1.5 text-sm">
            {t.forms.investorPerks.map((perk) => (
              <li key={perk} className="flex items-start gap-2">
                <span aria-hidden="true" style={{ color: 'var(--brand-green)' }}>
                  ✓
                </span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
          <div>
            <p className="text-[0.72rem] font-semibold text-ink-3 mb-1.5">
              {t.forms.investorExampleLabel}
            </p>
            <dl className="text-sm space-y-1">
              {t.forms.investorExample.map((row) => (
                <div key={row.rate} className="flex justify-between gap-4">
                  <dt className="text-ink-3">{row.rate}</dt>
                  <dd className="font-semibold tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {field('name', t.forms.name)}
      {field('email', t.forms.email, 'email')}
      {kind === 'investor' && field('phone', t.forms.phone, 'tel')}
      {kind === 'investor' && field('city', t.forms.city)}
      {kind === 'waitlist' && field('carModel', t.forms.carModel, 'text', false)}
      {kind === 'investor' && field('notes', t.forms.notes, 'text', false, true)}

      <div className="flex items-start gap-2">
        <input
          id={`${baseId}-consent`}
          type="checkbox"
          className="mt-1"
          checked={values.consent === 'yes'}
          onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked ? 'yes' : '' }))}
          aria-invalid={Boolean(errors.consent)}
        />
        <label htmlFor={`${baseId}-consent`} className="text-xs text-ink-2">
          {t.forms.consent}
        </label>
      </div>
      {errors.consent && (
        <p className="text-xs" style={{ color: '#b42318' }}>
          {errors.consent}
        </p>
      )}

      {/* Turnstile mounts here when a site key is present. Verification of the
          token happens server-side in the endpoint, not in the browser. */}
      {TURNSTILE_SITE_KEY && (
        <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="auto" />
      )}

      <button type="submit" className="gw-btn w-full" disabled={sending}>
        {sending ? t.forms.sending : kind === 'waitlist' ? t.forms.submitWaitlist : t.forms.submitInvestor}
      </button>

      <p className="text-[0.7rem] text-ink-3">{t.forms.protected}</p>

      {notice && (
        <p role="alert" className="text-xs" style={{ color: 'var(--amber-text-safe)' }}>
          {notice}
        </p>
      )}
    </form>
  )
}

export function RegisterDialog() {
  const { t } = useT()
  const open = useJourney((s) => s.registerOpen)
  const setOpen = useJourney((s) => s.setRegisterOpen)
  const [kind, setKind] = useState<FormKind>('waitlist')
  const [success, setSuccess] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('button, input')?.focus()

    // Focus trap + Escape, so keyboard users cannot tab out into the journey
    // behind the dialog.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const focusables = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
      )
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
      ;(opener.current as HTMLElement | null)?.focus?.()
    }
  }, [open, setOpen])

  useEffect(() => {
    if (!open) setSuccess(null)
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center p-4"
      style={{ background: 'rgb(10 15 13 / 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false)
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
        className="gw-card w-full max-w-md max-h-[88svh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 id="register-title" className="text-lg font-bold">
            {kind === 'waitlist' ? t.forms.waitlistTitle : t.forms.investorTitle}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t.forms.close}
            className="text-xl leading-none px-1"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {success ? (
          <div role="status">
            <p className="gw-chip mb-3" style={{ color: 'var(--brand-green-strong)' }}>
              <span aria-hidden="true">✓</span>
              {success}
            </p>
            <button type="button" className="gw-btn gw-btn--ghost w-full" onClick={() => setOpen(false)}>
              {t.forms.close}
            </button>
          </div>
        ) : (
          <>
            <div role="tablist" aria-label={t.nav.register} className="flex gap-2 mb-4">
              {(['waitlist', 'investor'] as FormKind[]).map((k) => (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  aria-selected={kind === k}
                  onClick={() => setKind(k)}
                  className={kind === k ? 'gw-btn text-xs' : 'gw-btn gw-btn--ghost text-xs'}
                >
                  {k === 'waitlist' ? t.forms.tabWaitlist : t.forms.tabInvestor}
                </button>
              ))}
            </div>
            <FormFields key={kind} kind={kind} onDone={setSuccess} />
          </>
        )}
      </div>
    </div>
  )
}
