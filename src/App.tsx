import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { BrowserRouter } from 'react-router-dom'
import { AuthBootstrap } from './components/AuthBootstrap'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/ToastProvider'
import { GlobalUiFeedback } from './components/GlobalUiFeedback'
import { LocalizationProvider } from './i18n/LocalizationContext'
import { LocalizedDocument } from './i18n/LocalizedDocument'
import { AppRouter } from './routes/AppRouter'
import { appTheme } from './theme/theme'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <LocalizationProvider>
          <LocalizedDocument />
          <ToastProvider>
          <GlobalUiFeedback />
          <BrowserRouter>
            <AuthBootstrap>
              <AppRouter />
            </AuthBootstrap>
          </BrowserRouter>
          </ToastProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
