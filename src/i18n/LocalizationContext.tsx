import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supportedLocales, translate, type AppLocale } from './resources'

const STORAGE_KEY = 'cw.ui.locale'
type LocalizationValue = {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (source: string) => string
  formatNumber: (value: number) => string
  formatDate: (value: string | Date) => string
  formatCurrency: (value: number, currency?: string) => string
}
const LocalizationContext = createContext<LocalizationValue | null>(null)
export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => localStorage.getItem(STORAGE_KEY) === 'bn-BD' ? 'bn-BD' : 'en')
  function setLocale(next: AppLocale) { localStorage.setItem(STORAGE_KEY, next); setLocaleState(next) }
  useEffect(() => { document.documentElement.lang = locale }, [locale])
  const value = useMemo<LocalizationValue>(() => ({
    locale, setLocale, t: (source) => translate(source, locale),
    formatNumber: (number) => new Intl.NumberFormat(locale).format(number),
    formatDate: (date) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(date)),
    formatCurrency: (amount, currency = 'BDT') => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount),
  }), [locale])
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>
}
export function useLocalization() {
  const value = useContext(LocalizationContext)
  if (!value) throw new Error('useLocalization must be used within LocalizationProvider')
  return value
}
export { supportedLocales }
export type { AppLocale }
