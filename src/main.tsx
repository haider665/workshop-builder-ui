import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import App from './App'

// A deployment can briefly serve a fresh index with an older browser cache.
// Retry one time when a lazy route chunk cannot be loaded; do not loop forever.
const preloadRetryKey = 'cw.vite.preload-retry'
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  if (sessionStorage.getItem(preloadRetryKey) !== '1') {
    sessionStorage.setItem(preloadRetryKey, '1')
    window.location.reload()
  } else {
    sessionStorage.removeItem(preloadRetryKey)
  }
})
window.setTimeout(() => sessionStorage.removeItem(preloadRetryKey), 15_000)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
