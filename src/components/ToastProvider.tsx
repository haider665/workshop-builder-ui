import { Alert, Box, Snackbar, useMediaQuery, useTheme, type AlertColor } from '@mui/material'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, getUiErrorMessage, type ToastContextValue, type ToastOptions } from '../hooks/useToast'

type ToastState = {
  key: number
  open: boolean
  message: string
  severity: AlertColor
  duration: number
  actionUrl?: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [toast, setToast] = useState<ToastState>({
    key: 0,
    open: false,
    message: '',
    severity: 'info',
    duration: 3500,
    actionUrl: undefined,
  })

  const showToast = useCallback((message: string, options: ToastOptions & { actionUrl?: string } = {}) => {
    setToast({
      key: Date.now(),
      open: true,
      message,
      severity: options.severity ?? 'info',
      duration: options.duration ?? (options.severity === 'error' ? 6000 : 3500),
      actionUrl: options.actionUrl,
    })
  }, [])

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    success: (message) => showToast(message, { severity: 'success' }),
    error: (error, fallback) => showToast(getUiErrorMessage(error, fallback), { severity: 'error' }),
    warning: (message) => showToast(message, { severity: 'warning' }),
    info: (message) => showToast(message, { severity: 'info' }),
  }), [showToast])

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail
      showToast(getUiErrorMessage(detail?.message), { severity: 'error', duration: 6500 })
    }
    const notificationListener = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; actionUrl?: string }>).detail
      showToast(detail?.message || "New workshop notification", { severity: "info", duration: 5000, actionUrl: detail?.actionUrl })
    }
    window.addEventListener('cw:api-error-toast', listener)
    window.addEventListener('cw:notification-toast', notificationListener)
    return () => { window.removeEventListener('cw:api-error-toast', listener); window.removeEventListener('cw:notification-toast', notificationListener) }
  }, [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast.key}
        open={toast.open}
        autoHideDuration={toast.duration}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setToast((current) => ({ ...current, open: false }))
        }}
        anchorOrigin={{ vertical: 'top', horizontal: mobile ? 'center' : 'right' }}
        sx={{
          mt: { xs: 0.75, sm: 1.5 },
          maxWidth: { xs: 'calc(100vw - 24px)', sm: 440 },
          '& .MuiPaper-root': { width: '100%' },
        }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((current) => ({ ...current, open: false }))}
          sx={{ borderRadius: 2.5, boxShadow: 8, alignItems: 'center', overflowWrap: 'anywhere' }}
        >
          <Box onClick={() => { if (toast.actionUrl) window.location.assign(toast.actionUrl) }} sx={{ cursor: toast.actionUrl ? 'pointer' : 'default' }}>{toast.message}{toast.actionUrl ? <Box component="span" sx={{ display:'block',fontSize:11,fontWeight:800,mt:.25 }}>Open details</Box> : null}</Box>
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}
