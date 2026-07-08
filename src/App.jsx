import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import Orders from './pages/Orders'
import OrderForm from './pages/OrderForm'
import OrderDetail from './pages/OrderDetail'
import Reports from './pages/Reports'
import DriveManager from './pages/DriveManager'
import Login from './pages/Login'
import { initGoogleAPI } from './lib/drive'
import { isLoggedIn, getRole } from './lib/auth'
import './index.css'

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return children
}

function AnimatedRoutes() {
  const location = useLocation()
  const role = getRole()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/"             element={<ProtectedRoute>{role === 'admin' ? <AdminDashboard /> : <Dashboard />}</ProtectedRoute>} />
        <Route path="/admin"        element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/orders"       element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/orders/new"   element={<ProtectedRoute><OrderForm /></ProtectedRoute>} />
        <Route path="/orders/:id"   element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="/drive"        element={<ProtectedRoute><DriveManager /></ProtectedRoute>} />
        <Route path="/reports"      element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  useEffect(() => {
    initGoogleAPI().catch(console.error)
  }, [])

  const loggedIn = isLoggedIn()

  return (
    <BrowserRouter>
      <div className="app-layout">
        {loggedIn && <Sidebar />}
        <div className={loggedIn ? 'main-content' : 'main-content-full'}>
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
