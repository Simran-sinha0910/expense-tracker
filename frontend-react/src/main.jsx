import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './routes/AppRouter'
import { AuthProvider } from './context/AuthContext'
import './styles/globals.css'
import './styles/legacy.css'
import ToastHost from './components/ToastHost'

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <ToastHost />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
