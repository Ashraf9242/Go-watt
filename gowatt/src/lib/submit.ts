/**
 * FORM SUBMISSION ADAPTER
 *
 * The two forms on this site are the actual point of the whole build, so the
 * transport is isolated here and nowhere else.
 *
 * Wiring it to real storage is one env var:
 *
 *   VITE_FORMS_ENDPOINT=https://<project>.supabase.co/functions/v1/submit
 *   VITE_TURNSTILE_SITE_KEY=0x...            (optional, enables the widget)
 *
 * The endpoint receives { form, payload, token } as JSON and is where
 * Supabase/Neon insertion, the Resend/SendGrid bilingual confirmation email,
 * Turnstile verification and rate limiting belong — server-side, never here.
 * See README §"Wiring the forms".
 *
 * With no endpoint configured, submissions are queued in localStorage and the
 * call reports `queued`, so the UI is fully testable before the backend
 * exists — but nothing is ever silently reported as delivered.
 */

export type FormKind = 'waitlist' | 'investor'

export type SubmitResult =
  | { status: 'sent' }
  | { status: 'queued'; reason: 'no-endpoint' }
  | { status: 'error'; message: string }

const ENDPOINT = import.meta.env.VITE_FORMS_ENDPOINT as string | undefined
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

const QUEUE_KEY = 'gowatt:queued-submissions'

function queue(form: FormKind, payload: Record<string, string>) {
  try {
    const existing = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? '[]') as unknown[]
    existing.push({ form, payload, at: new Date().toISOString() })
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(existing))
  } catch {
    /* storage unavailable — nothing else to do client-side */
  }
}

/** Client-side throttle. Real rate limiting must also live on the server. */
function throttled(form: FormKind): boolean {
  const key = `gowatt:last-submit:${form}`
  try {
    const last = Number(window.localStorage.getItem(key) ?? 0)
    if (Date.now() - last < 20_000) return true
    window.localStorage.setItem(key, String(Date.now()))
    return false
  } catch {
    return false
  }
}

export async function submitForm(
  form: FormKind,
  payload: Record<string, string>,
  token?: string,
): Promise<SubmitResult> {
  if (throttled(form)) {
    return { status: 'error', message: 'throttled' }
  }

  if (!ENDPOINT) {
    queue(form, payload)
    return { status: 'queued', reason: 'no-endpoint' }
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form, payload, token }),
    })
    if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` }
    return { status: 'sent' }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'network' }
  }
}

/* ------------------------------------------------------------ validation */

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

/** Accepts Omani and international formats; deliberately permissive. */
export const isPhone = (v: string) => /^[+\d][\d\s()-]{6,17}$/.test(v.trim())
