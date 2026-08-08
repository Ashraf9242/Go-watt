import { useEffect } from 'react'
import { DICT, dirOf, type Dict } from './dict'
import { useJourney } from '../store/journey'

/**
 * Returns the active dictionary and keeps <html lang/dir> in sync.
 * Client-side switching is a convenience only — /en is a real, separately
 * crawlable page with reciprocal hreflang, which is what SEO actually needs.
 */
export function useT(): { t: Dict; lang: 'ar' | 'en'; dir: 'rtl' | 'ltr' } {
  const lang = useJourney((s) => s.lang)

  useEffect(() => {
    const el = document.documentElement
    el.lang = lang
    el.dir = dirOf(lang)
  }, [lang])

  return { t: DICT[lang], lang, dir: dirOf(lang) }
}
