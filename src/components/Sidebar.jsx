import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, ClipboardList, PlusCircle, BarChart2, Layers, LogOut, LogIn, HardDrive, AlertCircle, X, CheckCircle, FolderOpen } from 'lucide-react'
import { isGoogleSignedIn, signInToGoogle, signOutGoogle, initGoogleAPI } from '../lib/drive'
import { useState, useEffect } from 'react'
import { MonitorDown } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: ClipboardList, label: 'Semua Orderan' },
  { to: '/orders/new', icon: PlusCircle, label: 'Tambah Orderan' },
  { to: '/mockup', icon: Layers, label: 'Mockup Studio' },
  { to: '/drive', icon: FolderOpen, label: 'Drive Manager' },
  { to: '/reports', icon: BarChart2, label: 'Laporan' },
]

// Instructions modal for Google Drive setup
function DriveSetupModal({ onClose }) {
  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', padding: 28,
          maxWidth: 480, width: '100%', boxShadow: 'var(--shadow-lg)',
        }}
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <AlertCircle size={20} style={{ color: 'var(--warning)' }} />
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Setup Google Drive</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ikuti langkah ini agar bisa connect ke Google Drive</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              step: 1,
              title: 'Buka Google Cloud Console',
              desc: 'Pergi ke console.cloud.google.com → pilih project-mu',
              link: 'https://console.cloud.google.com/apis/credentials',
              linkLabel: 'Buka Credentials ↗',
            },
            {
              step: 2,
              title: 'Edit OAuth 2.0 Client ID',
              desc: 'Klik OAuth Client ID yang kamu punya → di "Authorized JavaScript origins" klik Add URI',
            },
            {
              step: 3,
              title: 'Tambah URI ini',
              code: 'http://localhost:5173',
              desc: 'Copy URI di atas, paste, lalu klik Save',
            },
            {
              step: 4,
              title: 'Tunggu 1-2 menit',
              desc: 'Google butuh waktu singkat untuk propagasi. Setelah itu coba connect lagi.',
            },
          ].map(s => (
            <div key={s.step} style={{
              display: 'flex', gap: 12, padding: '12px 14px',
              background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}>{s.step}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 3 }}>{s.title}</div>
                {s.code && (
                  <div style={{
                    fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '4px 10px',
                    borderRadius: 6, fontSize: 13, color: 'var(--accent)', marginBottom: 4,
                    border: '1px solid var(--border)', display: 'inline-block',
                  }}>{s.code}</div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</div>
                {s.link && (
                  <a href={s.link} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'block', marginTop: 4 }}>
                    {s.linkLabel}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}>
          <CheckCircle size={15} /> Mengerti, coba lagi
        </button>
      </motion.div>
    </motion.div>
  )
}

export default function Sidebar() {
  const [driveConnected, setDriveConnected] = useState(false)
  const [driveLoading, setDriveLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    initGoogleAPI().catch(() => {})
    
    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    const checkInterval = setInterval(() => {
      const status = isGoogleSignedIn()
      if (status !== driveConnected) setDriveConnected(status)
      if (driveLoading) setDriveLoading(false)
    }, 1000)

    return () => {
      clearInterval(checkInterval)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [driveConnected, driveLoading])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    }
  }

  const handleDriveToggle = async () => {
    if (driveConnected) {
      signOutGoogle()
      setDriveConnected(false)
      return
    }

    setDriveLoading(true)
    try {
      await initGoogleAPI()
      await signInToGoogle()
      setDriveConnected(true)
    } catch (e) {
      console.error('Drive auth error:', e)
      // Show setup instructions if invalid_client / no registered origin
      if (
        e.message?.includes('invalid_client') ||
        e.message?.includes('origin') ||
        e.message?.includes('idpiframe')
      ) {
        setShowSetup(true)
      }
    } finally {
      setDriveLoading(false)
    }
  }

  return (
    <>
      <motion.aside
        className="sidebar"
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <motion.div
            className="sidebar-logo-icon"
            whileHover={{ scale: 1.08, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400 }}
            style={{ padding: 0, overflow: 'hidden', background: 'transparent' }}
          >
            <img src="/logo.png" alt="Si Rekap" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">Si Rekap</span>
            <span className="sidebar-logo-sub">Order Manager</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="nav-section-label">Menu</span>
          {navItems.map((item, i) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {({ isActive }) => (
                <motion.div
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        className="nav-active-bar"
                        layoutId="activeBar"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        exit={{ scaleY: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      />
                    )}
                  </AnimatePresence>
                  <item.icon className="nav-icon" size={18} />
                  {item.label}
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer - Google Drive */}
        <div className="sidebar-footer">
          {/* Install PWA */}
          {deferredPrompt && (
            <motion.button
              onClick={handleInstallClick}
              style={{
                width: '100%', textAlign: 'left', fontSize: 13, color: 'var(--text-primary)',
                background: 'var(--accent)', border: 'none', cursor: 'pointer', padding: '10px 14px',
                borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                fontWeight: 600, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <MonitorDown size={16} /> Install Si Rekap Desktop
            </motion.button>
          )}

          {/* Setup hint */}
          {!driveConnected && !driveLoading && (
            <motion.button
              onClick={() => setShowSetup(true)}
              style={{
                width: '100%', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px 8px',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              whileHover={{ color: 'var(--accent)' }}
            >
              <AlertCircle size={11} /> Tidak bisa connect? Setup guide
            </motion.button>
          )}

          <motion.div
            className="drive-status"
            onClick={handleDriveToggle}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{ position: 'relative' }}
          >
            <motion.div
              className={`drive-dot ${driveConnected ? 'connected' : ''}`}
              animate={driveConnected ? { scale: [1, 1.3, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <HardDrive size={16} style={{ color: driveConnected ? 'var(--success)' : 'var(--text-muted)' }} />
            <div className="drive-info">
              <div className="drive-label">
                {driveLoading ? 'Menghubungkan...' : driveConnected ? 'Google Drive' : 'Hubungkan Drive'}
              </div>
              <div className="drive-sublabel">
                {driveLoading ? 'Mohon tunggu...' : driveConnected ? '✓ Terhubung' : 'Klik untuk login'}
              </div>
            </div>
            {driveConnected ? <LogOut size={14} style={{ color: 'var(--text-muted)' }} /> : <LogIn size={14} style={{ color: 'var(--accent)' }} />}
          </motion.div>
        </div>
      </motion.aside>

      {/* Setup Modal */}
      <AnimatePresence>
        {showSetup && <DriveSetupModal onClose={() => setShowSetup(false)} />}
      </AnimatePresence>
    </>
  )
}
