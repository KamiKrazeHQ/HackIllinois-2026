'use client'
import { createContext, useContext, useState, useRef, ReactNode } from 'react'
import { translateTexts } from '../api'
import { SOURCE } from './strings'

export const LANGS = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Spanish' },
  { code: 'fr', label: 'FR', name: 'French' },
  { code: 'de', label: 'DE', name: 'German' },
]

interface TranslationCtx {
  t: (key: string) => string
  lang: string
  setLang: (code: string) => Promise<void>
  translating: boolean
}

const TranslationContext = createContext<TranslationCtx>({
  t: (k) => SOURCE[k] ?? k,
  lang: 'en',
  setLang: async () => {},
  translating: false,
})

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState('en')
  const [translating, setTranslating] = useState(false)
  const cache = useRef<Record<string, Record<string, string>>>({ en: SOURCE })

  const t = (key: string): string => cache.current[lang]?.[key] ?? SOURCE[key] ?? key

  async function setLang(code: string) {
    if (code === lang) return
    if (!cache.current[code]) {
      setTranslating(true)
      try {
        const keys = Object.keys(SOURCE)
        const texts = Object.values(SOURCE)
        const data = await translateTexts(texts, code) as { translations: string[] }
        const translated: Record<string, string> = {}
        keys.forEach((k, i) => { translated[k] = data.translations[i] })
        cache.current[code] = translated
      } catch (err) {
        console.error('Translation failed:', err)
        setTranslating(false)
        return
      } finally {
        setTranslating(false)
      }
    }
    setLangState(code)
  }

  return (
    <TranslationContext.Provider value={{ t, lang, setLang, translating }}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useT() {
  return useContext(TranslationContext)
}
