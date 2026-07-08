import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, LogIn, Palette, ShieldCheck } from 'lucide-react'

const ACCOUNTS = [
  {
    role: 'designer',
    label: 'Designer',
    desc: 'Kelola orderan, file, dan workflow',
    icon: Palette,
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    password: 'designer123',
  },
  {
    role: 'admin',
    label: 'Admin',
    desc: 'Dashboard lengkap, grafik, dan laporan',
    icon: ShieldCheck,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
    password: 'admin123',
  },
]

export default function Login() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState('designer')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const account = ACCOUNTS.find(a => a.role === selected)

  const handleLogin = async () => {
    setError('')
    if (!password) { setError('Password wajib diisi!'); return }

    if (password !== account.password) {
      setError('Password salah! Coba lagi.')
      setShake(true)
      setTimeout(() => setShake(false), 600)
      return
    }

    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    localStorage.setItem('sirekap_role', selected)
    localStorage.setItem('sirekap_logged_in', '1')
    navigate(selected === 'admin' ? '/admin' : '/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background blobs */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-10%', left: '-5%',
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          }}
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', bottom: '-10%', right: '-5%',
            width: 600, height: 600, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            whileHover={{ scale: 1.06, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400 }}
            style={{
              width: 72, height: 72, borderRadius: 20, overflow: 'hidden',
              margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
            }}
          >
            <img src="/logo.png" alt="Si Rekap" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, marginBottom: 6 }}>
            Si Rekap
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
            Order Manager — Masuk ke akun kamu
          </p>
        </div>

        {/* Card */}
        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: 'var(--bg-card)',
            borderRadius: 20,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Role selector */}
          <div style={{ padding: '24px 24px 0' }}>
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Masuk sebagai
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {ACCOUNTS.map(acc => {
                const Icon = acc.icon
                const isSelected = selected === acc.role
                return (
                  <motion.button
                    key={acc.role}
                    id={`role-${acc.role}`}
                    onClick={() => { setSelected(acc.role); setPassword(''); setError('') }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      border: isSelected ? `2px solid ${acc.color}` : '2px solid var(--border)',
                      borderRadius: 14,
                      padding: '14px 16px',
                      background: isSelected ? `${acc.color}12` : 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, marginBottom: 8,
                      background: isSelected ? acc.gradient : 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isSelected ? `0 4px 12px ${acc.color}40` : 'none',
                      transition: 'all 0.3s',
                    }}>
                      <Icon size={18} style={{ color: isSelected ? 'white' : 'var(--text-muted)' }} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: isSelected ? acc.color : 'var(--text-primary)', marginBottom: 2 }}>
                      {acc.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {acc.desc}
                    </div>
                    {isSelected && (
                      <motion.div
                        layoutId="roleIndicator"
                        style={{
                          position: 'absolute', top: 10, right: 10,
                          width: 8, height: 8, borderRadius: '50%',
                          background: acc.gradient,
                          boxShadow: `0 0 8px ${acc.color}`,
                        }}
                        transition={{ type: 'spring', stiffness: 400 }}
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Password area */}
          <div style={{ padding: '0 24px 24px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {/* Hint */}
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                  background: `${account.color}10`,
                  border: `1px solid ${account.color}25`,
                  fontSize: 12, color: account.color, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <account.icon size={14} />
                  Password hint: <code style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{account.password}</code>
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password"
                      type={showPw ? 'text' : 'password'}
                      className="form-input"
                      placeholder={`Password ${account.label}...`}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      autoFocus
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: 4,
                      }}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        color: 'var(--danger)', fontSize: 13, fontWeight: 600,
                        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      ⚠️ {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  id="btn-login"
                  className="btn"
                  onClick={handleLogin}
                  disabled={loading}
                  whileHover={{ scale: 1.02, boxShadow: `0 8px 24px ${account.color}40` }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%', justifyContent: 'center',
                    background: account.gradient,
                    color: 'white', border: 'none',
                    padding: '12px 24px', fontSize: 15, fontWeight: 700,
                    borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? (
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} />
                  ) : (
                    <LogIn size={17} />
                  )}
                  {loading ? 'Masuk...' : `Masuk sebagai ${account.label}`}
                </motion.button>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          © 2025 Si Rekap • Bhinneka Production
        </p>
      </motion.div>
    </div>
  )
}
