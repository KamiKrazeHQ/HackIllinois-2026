'use client'
import { TranslationProvider } from './i18n/TranslationContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <TranslationProvider>{children}</TranslationProvider>
}
