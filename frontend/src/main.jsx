import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './responsive.css'

// Capture global errors
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error || e.message)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason)
})

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="color:red;padding:40px">Erro: #root não encontrado</div>'
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
}
