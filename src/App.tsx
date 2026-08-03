import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import { BrowserRouter } from 'react-router-dom'
import { AuthBootstrap } from './components/AuthBootstrap'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/ToastProvider'
import { AppRouter } from './routes/AppRouter'
import { appTheme } from './theme/theme'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <ToastProvider>
          <BrowserRouter>
            <AuthBootstrap>
              <AppRouter />
            </AuthBootstrap>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
