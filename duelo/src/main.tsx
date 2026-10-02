import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/globals.css'
import App from './App.tsx'

// Visual QA harness (dev server only, see .env.visual). DEV is false in
// `vite build`, so this branch and the module are dropped from production.
if (import.meta.env.DEV && import.meta.env.VITE_VISUAL_HARNESS === 'true') {
  await import('./lib/visualHarness')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
