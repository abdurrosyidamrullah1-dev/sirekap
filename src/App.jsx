import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import OrderForm from './pages/OrderForm'
import OrderDetail from './pages/OrderDetail'
import Reports from './pages/Reports'
import DriveManager from './pages/DriveManager'
import { initGoogleAPI } from './lib/drive'
import './index.css'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"             element={<Dashboard />} />
        <Route path="/orders"       element={<Orders />} />
        <Route path="/orders/new"   element={<OrderForm />} />
        <Route path="/orders/:id"   element={<OrderDetail />} />
        <Route path="/drive"        element={<DriveManager />} />
        <Route path="/reports"      element={<Reports />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  useEffect(() => {
    initGoogleAPI().catch(console.error)
    document.documentElement.setAttribute('data-role', 'designer')
    
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <AnimatedRoutes />
        </div>
      </div>
      <Toaster

        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 500,
            boxShadow: 'var(--shadow-lg)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
    </BrowserRouter>
  )
}
