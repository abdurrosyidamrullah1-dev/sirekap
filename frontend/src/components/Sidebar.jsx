import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, ClipboardList, PlusCircle, BarChart2, LogOut, LogIn, HardDrive, AlertCircle, X, FolderOpen, Fingerprint } from 'lucide-react'
import { isGoogleSignedIn, signInToGoogle, signOutGoogle, initGoogleAPI } from '../lib/drive'
import { useState, useEffect } from 'react'
import { MonitorDown, Moon, Sun } from 'lucide-react'
import { getOrders } from '../lib/supabase'
import { getDeadlineAlertOrders } from '../lib/notifications'

const DESIGNER_NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/absen',     icon: Fingerprint,     label: 'Absen' },
  { to: '/orders',    icon: ClipboardList,   label: 'Semua Orderan' },
  { to: '/orders/new',icon: PlusCircle,      label: 'Tambah Orderan' },
  { to: '/drive',     icon: FolderOpen,      label: 'Drive Manager' },
  { to: '/reports',   icon: BarChart2,       label: 'Laporan' },
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
              title: 'Tambahkan URI ke Authorized Origins',
              desc: 'Buka Google Cloud Console > Credentials > Edit OAuth 2.0 Client ID. Tambahkan URI berikut ke "Authorized JavaScript origins":',
              copy: window.location.origin
            },
            {
              title: 'Tunggu beberapa menit',
              desc: 'Setelah di-save, tunggu sekitar 5 menit agar perubahan di Google Cloud Console tersimpan sempurna.',
            },
            {
              title: 'Clear Cache / Hard Reload',
              desc: 'Lakukan hard reload (Ctrl+Shift+R atau Cmd+Shift+R) untuk memastikan browser mengambil config terbaru.',
            }
          ].map((step, i) => (
            <div key={i} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, display: 'flex', gap: 8 }}>
                <div style={{ width: 18, height: 18, background: 'var(--accent)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{i + 1}</div>
                {step.title}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 26 }}>{step.desc}</p>
              {step.copy && (
                <div style={{ marginLeft: 26, marginTop: 8, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                  <code style={{ color: 'var(--accent)', fontWeight: 600 }}>{step.copy}</code>
                  <button className="btn btn-sm" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => {
                    navigator.clipboard.writeText(step.copy)
                    toast.success('URI disalin!')
                  }}>Copy</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Sidebar() {
  const [driveConnected, setDriveConnected] = useState(false)
  const [driveLoading, setDriveLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })
  const [hoveredNav, setHoveredNav] = useState(null)
  const [deadlineAlerts, setDeadlineAlerts] = useState(0)

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })

    const fetchAlerts = async () => {
      try {
        const orders = await getOrders({ role: 'designer' })
        setDeadlineAlerts(getDeadlineAlertOrders(orders))
      } catch (e) {
        // ignore
      }
    }
    fetchAlerts()
    // Poll setiap 2 menit untuk deadline alerts
    const alertInterval = setInterval(fetchAlerts, 2 * 60 * 1000)
    return () => clearInterval(alertInterval)
  }, [])

  useEffect(() => {
    const checkDrive = async () => {
      try {
        await initGoogleAPI()
        const signedIn = isGoogleSignedIn()
        setDriveConnected(signedIn)
      } catch (e) {
        console.error('Drive init failed', e)
        setDriveConnected(false)
      } finally {
        setDriveLoading(false)
      }
    }
    checkDrive()

    const tokenCheckInterval = setInterval(() => {
      if (!driveLoading) {
        const currentlyConnected = isGoogleSignedIn()
        if (currentlyConnected !== driveConnected) {
          setDriveConnected(currentlyConnected)
        }
      }
    }, 5000)

    return () => {
      clearInterval(tokenCheckInterval)
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
        {/* ── Header / Logo ── */}
        <div style={{
          padding: '0 0 0 0',
          background: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Role badge strip */}
          <div style={{
            padding: '6px 14px',
            background: 'linear-gradient(90deg, var(--accent-light), transparent)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#6366f1',
              boxShadow: '0 0 8px #6366f1',
            }} />
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 2,
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}>
              DESIGNER PANEL
            </span>
          </div>

          {/* Logo row */}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.div
              whileHover={{ scale: 1.08, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400 }}
              style={{
                width: 42, height: 42, borderRadius: 12, overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 0 16px rgba(99,102,241,0.35)',
                border: '2px solid #6366f140',
              }}
            >
              <img src="/icon.svg" alt="Si Rekap" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </motion.div>
            <div>
              <div style={{
                fontWeight: 900, fontSize: 16, letterSpacing: -0.5,
                color: 'var(--text-primary)', lineHeight: 1.2,
              }}>Si Rekap</div>
              <div style={{
                fontSize: 10, fontWeight: 600, marginTop: 2,
                color: 'var(--text-secondary)',
                letterSpacing: 0.3,
              }}>
                Design Manager
              </div>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav className="sidebar-nav" style={{ padding: '12px 10px' }}>
          <span className="nav-section-label" style={{
            display: 'block', padding: '8px 6px 6px',
          }}>Menu Utama</span>
          {DESIGNER_NAV.map((item, i) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} style={{ textDecoration: 'none' }}>
              {({ isActive }) => {
                const isHovered = hoveredNav === item.to && !isActive
                const isDark = theme === 'dark'
                const hoverBg = isDark
                  ? 'linear-gradient(135deg, #6366f1, #3b82f6)'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)'
                const activeBg = isDark
                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                  : 'linear-gradient(135deg, #1d4ed8, #1e40af)'

                return (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
                  >
                    <div
                      onMouseEnter={() => setHoveredNav(item.to)}
                      onMouseLeave={() => setHoveredNav(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px 10px 10px',
                        borderRadius: 8,
                        marginBottom: 2,
                        cursor: 'pointer',
                        color: isActive || isHovered ? '#ffffff' : 'var(--text-secondary)',
                        background: isActive ? activeBg : isHovered ? hoverBg : 'transparent',
                        fontWeight: isActive || isHovered ? 700 : 500,
                        borderLeft: isActive || isHovered
                          ? '3px solid rgba(255,255,255,0.55)'
                          : '3px solid transparent',
                        boxShadow: isHovered ? '0 4px 16px rgba(37,99,235,0.35)' : 'none',
                        transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                        position: 'relative'
                      }}
                    >
                      <item.icon size={17} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.to === '/orders' && deadlineAlerts > 0 && (
                        <span style={{
                          background: '#ef4444', color: 'white',
                          fontSize: 10, fontWeight: 800, padding: '2px 6px',
                          borderRadius: 99, boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                        }}>
                          {deadlineAlerts}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              }}
            </NavLink>
          ))}
        </nav>



        {/* ── Footer ── */}
        <div className="sidebar-footer">
          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            style={{
              width: '100%', textAlign: 'left', fontSize: 13, color: 'var(--text-primary)',
              background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', padding: '10px 14px',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
              fontWeight: 600
            }}
            whileHover={{ scale: 1.02, background: 'var(--accent-light)' }}
            whileTap={{ scale: 0.98 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />} 
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </div>
          </motion.button>

          {/* Install PWA */}
          {deferredPrompt && (
            <motion.button
              onClick={handleInstallClick}
              style={{
                width: '100%', textAlign: 'left', fontSize: 13, color: 'var(--text-primary)',
                background: 'var(--accent)', border: 'none', cursor: 'pointer', padding: '10px 14px',
                borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                fontWeight: 600, boxShadow: 'var(--shadow-blue)'
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
