import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initTheme } from '@/lib/themes'
import { initMode } from '@/lib/mode'
import '@/lib/install' // capture `beforeinstallprompt` dès le démarrage

// Applique le thème + le mode (nuit/jour/auto) AVANT le rendu (zéro flash).
initTheme()
initMode()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
