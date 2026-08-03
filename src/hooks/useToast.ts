import type { AlertColor } from '@mui/material'
import { createContext, useContext } from 'react'

export type ToastOptions = {
  severity?: AlertColor
  duration?: number
}

export type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void
  success: (message: string) => void
  error: (error: unknown, fallback?: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function getUiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : fallback
  const withoutMarkup = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const withoutException = withoutMarkup
    .replace(/^frappe\.exceptions\.[A-Za-z]+:\s*/i, '')
    .replace(/^[A-Za-z]+Error:\s*/i, '')
  return withoutException || fallback
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
