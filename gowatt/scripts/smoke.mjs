/**
 * End-to-end smoke test. Run a build + preview first, then `npm run smoke`.
 *
 *   npm run build && npm run preview &
 *   npm run smoke
 *
 * Drives a real Chrome (with software WebGL, so it works on CI) through the
 * journey and asserts the things that are easy to break silently: that all 14
 * scene tracks mount, that the charge percentage is genuinely driven by scroll
 * position, that the finale reaches 100%, that reduced-motion gets the
 * canvas-free journey, that the text pages ship no WebGL, and that /en/ is a
 * real English page with reciprocal hreflang. Any console error, page error or
 * failed request fails the run.
 *
 * Override with BASE=… and CHROME_PATH=… as needed.
 */
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE ?? 'http://localhost:4173'
const CHROME =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const errors = []
const results = []
const log = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'ok   ' : 'FAIL '} ${name}${detail ? `  — ${detail}` : ''}`)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--window-size=1280,900',
  ],
})

async function newPage() {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`))
  return page
}

/* ---------------------------------------------------- 1. journey page ---- */
{
  const page = await newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 2500))

  const h1 = await page.$eval('h1', (el) => el.textContent?.trim())
  log('hero h1 renders', Boolean(h1), h1)

  log('html dir is rtl', (await page.$eval('html', (el) => el.dir)) === 'rtl')
  log('mode defaults to day', (await page.$eval('html', (el) => el.dataset.mode)) === 'day')

  const canvasCount = await page.$$eval('canvas', (els) => els.length)
  log('webgl canvas mounted', canvasCount === 1, `${canvasCount} canvas`)

  const scenes = await page.$$eval('[data-scene]', (els) => els.map((e) => e.dataset.scene))
  log('all 14 scene tracks present', scenes.length === 14, scenes.join(','))

  const trackHeight = await page.$eval('#journey', (el) => el.scrollHeight)
  log('scroll track is tall', trackHeight > 8000, `${trackHeight}px`)

  // Scroll to the charge beat and confirm the percentage tracks scroll.
  const totalScroll = await page.evaluate(() => document.body.scrollHeight - innerHeight)
  const chargeAt = await page.evaluate(async (total) => {
    // charge scene spans roughly 0.33–0.43 of the journey
    window.scrollTo(0, Math.round(total * 0.40))
    await new Promise((r) => setTimeout(r, 900))
    const el = document.querySelector('[data-scene="charge"] [role="progressbar"]')
    return el?.getAttribute('aria-valuenow')
  }, totalScroll)
  log('charge % is driven by scroll', Number(chargeAt) > 5, `aria-valuenow=${chargeAt}`)

  // Sticky CTA appears once past the hero.
  const stickyVisible = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).some((b) => b.className.includes('fixed')),
  )
  log('sticky register CTA appears after hero', stickyVisible)

  // Finale: scroll to the very bottom of the journey track.
  const finale = await page.evaluate(async () => {
    const track = document.getElementById('journey')
    window.scrollTo(0, track.offsetTop + track.scrollHeight - innerHeight)
    await new Promise((r) => setTimeout(r, 1400))
    const bars = document.querySelectorAll('[data-scene="finale"] [role="progressbar"]')
    return bars.length ? bars[bars.length - 1].getAttribute('aria-valuenow') : null
  })
  log('finale battery reaches 100%', finale === '100', `aria-valuenow=${finale}`)

  // Night mode toggle
  const night = await page.evaluate(async () => {
    const btn = document.querySelector('[aria-pressed]')
    btn?.click()
    await new Promise((r) => setTimeout(r, 700))
    return document.documentElement.dataset.mode
  })
  log('night mode toggle works', night === 'night', `data-mode=${night}`)

  // Register dialog: open, validate, focus trap present
  const dialog = await page.evaluate(async () => {
    const btns = Array.from(document.querySelectorAll('button'))
    const cta = btns.find((b) => b.className.includes('fixed'))
    cta?.click()
    await new Promise((r) => setTimeout(r, 400))
    const d = document.querySelector('[role="dialog"]')
    if (!d) return { open: false }
    const submit = d.querySelector('button[type="submit"]')
    submit?.click()
    await new Promise((r) => setTimeout(r, 300))
    const invalid = d.querySelectorAll('[aria-invalid="true"]').length
    return { open: true, invalid, modal: d.getAttribute('aria-modal') }
  })
  log('register dialog opens', dialog.open === true)
  log('empty submit is blocked with field errors', (dialog.invalid ?? 0) >= 2, `${dialog.invalid} invalid fields`)
  log('dialog is aria-modal', dialog.modal === 'true')

  await page.close()
}

/* ------------------------------------------- 2. reduced-motion fallback -- */
{
  const page = await newPage()
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 1500))

  const canvases = await page.$$eval('canvas', (els) => els.length)
  log('reduced-motion serves the no-WebGL journey', canvases === 0, `${canvases} canvas`)

  const headings = await page.$$eval('h2', (els) => els.length)
  log('fallback carries the full journey content', headings >= 10, `${headings} h2 sections`)

  const svgs = await page.$$eval('svg[role="img"]', (els) => els.length)
  log('fallback illustrations render', svgs >= 3, `${svgs} illustrations`)
  await page.close()
}

/* --------------------------------------------------- 3. canvas-free pages */
for (const [path, expect] of [
  ['/about.html', 'من نحن'],
  ['/faq.html', 'الأسئلة الشائعة'],
  ['/privacy.html', 'سياسة الخصوصية'],
  ['/terms.html', 'شروط الاستخدام'],
]) {
  const page = await newPage()
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 30000 })
  const h1 = await page.$eval('h1', (el) => el.textContent?.trim())
  const canvases = await page.$$eval('canvas', (els) => els.length)
  log(`${path} renders and is canvas-free`, h1 === expect && canvases === 0, `h1="${h1}"`)
  await page.close()
}

/* ------------------------------- 4. FAQ accordion on the static page ---- */
{
  const page = await newPage()
  await page.goto(`${BASE}/faq.html`, { waitUntil: 'networkidle2', timeout: 30000 })
  const acc = await page.evaluate(async () => {
    const btn = document.querySelectorAll('[data-acc-btn]')[1]
    const before = btn.getAttribute('aria-expanded')
    btn.click()
    await new Promise((r) => setTimeout(r, 300))
    const panel = document.getElementById(btn.getAttribute('aria-controls'))
    return { before, after: btn.getAttribute('aria-expanded'), open: panel?.dataset.open }
  })
  log('static FAQ accordion toggles aria-expanded', acc.before === 'false' && acc.after === 'true' && acc.open === 'true')
  await page.close()
}

/* ---------------------------------------------------- 5. English page --- */
{
  const page = await newPage()
  await page.goto(`${BASE}/en/`, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 2000))
  const lang = await page.$eval('html', (el) => el.lang)
  const dir = await page.$eval('html', (el) => el.dir)
  const h1 = await page.$eval('h1', (el) => el.textContent?.trim())
  log('/en/ is English LTR', lang === 'en' && dir === 'ltr', `lang=${lang} dir=${dir}`)
  log('/en/ hero is English', h1?.includes('power'), h1)
  const hreflang = await page.$$eval('link[rel="alternate"]', (els) =>
    els.map((e) => e.getAttribute('hreflang')),
  )
  log('/en/ has reciprocal hreflang', hreflang.includes('ar') && hreflang.includes('en'), hreflang.join(','))
  await page.close()
}

await browser.close()

console.log('\n--- console/network errors captured ---')
const noise = errors.filter((e) => !/favicon|DevTools|Autofill/i.test(e))
if (noise.length === 0) console.log('(none)')
else noise.slice(0, 25).forEach((e) => console.log('  ' + e))

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} checks passed; ${noise.length} error(s) logged.`)
process.exit(failed === 0 && noise.length === 0 ? 0 : 1)
