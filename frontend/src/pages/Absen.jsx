import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Fingerprint, CheckCircle2, LogOut, Clock, Users,
  Wifi, WifiOff, ChevronDown, Nfc, ExternalLink, ShieldCheck, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Konstanta Google Form ────────────────────────────────────────────────────
const FORM_ID     = '1FAIpQLSfvF2UIKx_8UMUk_UNv-eoHu-DFFmu16ufniPeyQB0Y-zfPWQ'
const FORM_ACTION = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`
const ENTRY_NAMA   = 'entry.1750035187'   // ✅ confirmed
const ENTRY_STATUS = 'entry.704945981'    // ✅ confirmed

const NAMA_LIST = [
  'Julian', 'Melita', 'Bu Suci (Mama Danang)', 'Ocid', 'Rendy',
  'Fikri Gendru', 'Abdul Anabul', 'Ita', 'Pai king JJ 👑',
  'Hifzaa anak magang', 'Audie Bengkel', 'Manda', 'Danu', 'Mpok Wati',
]
const MY_NAME     = 'Ocid'
const STORAGE_KEY = 'absen_log_v1'
const CRED_KEY    = 'absen_webauthn_cred'  // simpan credential ID

// ─── Helpers storage ──────────────────────────────────────────────────────────
const getTodayKey    = () => new Date().toISOString().slice(0, 10)
const loadLog        = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} } }
const saveLog        = (l) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(l)) } catch {} }
const getStatusToday = (n) => loadLog()[getTodayKey()]?.[n] || null
const getTodayLog    = () => loadLog()[getTodayKey()] || {}

const recordStatus = (nama, status) => {
  const log = loadLog()
  if (!log[getTodayKey()]) log[getTodayKey()] = {}
  log[getTodayKey()][nama] = status
  saveLog(log)
}

// ─── Submit Google Form via hidden iframe ─────────────────────────────────────
let _iframe = null
const submitAbsen = (nama, statusValue) =>
  new Promise((resolve, reject) => {
    try {
      if (!_iframe) {
        _iframe = document.createElement('iframe')
        _iframe.name = '__absen__'
        _iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px'
        document.body.appendChild(_iframe)
      }
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = FORM_ACTION
      form.target = '__absen__'
      form.style.display = 'none'

      const add = (name, val) => {
        const i = document.createElement('input')
        i.type = 'hidden'; i.name = name; i.value = val
        form.appendChild(i)
      }
      add(ENTRY_NAMA, nama)
      add(ENTRY_STATUS, statusValue)

      document.body.appendChild(form)
      form.submit()
      setTimeout(() => {
        try { document.body.removeChild(form) } catch {}
        resolve()
      }, 1500)
    } catch (err) { reject(err) }
  })

// ─── WebAuthn / Face ID helpers ───────────────────────────────────────────────
const isWebAuthnSupported = () =>
  typeof window !== 'undefined' &&
  !!window.PublicKeyCredential &&
  typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'

const checkPlatformAuth = async () => {
  if (!isWebAuthnSupported()) return false
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
}

const toBase64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

const fromBase64url = (str) => {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer
}

// Register credential (pertama kali pakai Face ID)
const registerFaceID = async () => {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userId    = crypto.getRandomValues(new Uint8Array(16))

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Si Rekap Absen', id: window.location.hostname },
      user: {
        id: userId,
        name: MY_NAME,
        displayName: MY_NAME,
      },
      pubKeyCredParams: [
        { alg: -7,   type: 'public-key' },  // ES256 (Face ID)
        { alg: -257, type: 'public-key' },  // RS256 fallback
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',   // platform = Face ID / Touch ID
        userVerification: 'required',          // wajib biometrik
        residentKey: 'preferred',
      },
      timeout: 60000,
    }
  })
  // Simpan credential ID ke localStorage
  const credId = toBase64url(credential.rawId)
  localStorage.setItem(CRED_KEY, credId)
  return credId
}

// Verify / authenticate dengan Face ID
const verifyFaceID = async (credId) => {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const allowCreds = credId ? [{
    id: fromBase64url(credId),
    type: 'public-key',
    transports: ['internal'],
  }] : []

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: allowCreds,
      userVerification: 'required',
      timeout: 60000,
    }
  })
  return assertion !== null
}

// ─── Jam Real-time ────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const jam  = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const hari = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div style={{ textAlign: 'center', marginBottom: 20 }}>
      <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1.5, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {jam}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{hari}</div>
    </div>
  )
}

// ─── Face ID Setup Banner ─────────────────────────────────────────────────────
function FaceIDSetup({ onSetupDone }) {
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(null)

  useEffect(() => {
    checkPlatformAuth().then(setSupported)
  }, [])

  if (supported === null) return null
  if (!supported) return (
    <div style={{
      padding: '12px 16px', borderRadius: 12, marginBottom: 16,
      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
    }}>
      <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
      <span style={{ color: '#b45309' }}>
        Face ID / biometrik tidak tersedia di browser ini. Gunakan Safari iOS / Chrome Android.
      </span>
    </div>
  )

  const setup = async () => {
    setLoading(true)
    try {
      await registerFaceID()
      toast.success('✅ Face ID berhasil didaftarkan! Sekarang tap = Face ID dulu.')
      onSetupDone?.()
    } catch (err) {
      if (err.name === 'NotAllowedError') toast.error('Pendaftaran dibatalkan.')
      else toast.error('Gagal daftar Face ID: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '14px 16px', borderRadius: 14, marginBottom: 16,
        background: 'rgba(99,102,241,0.06)', border: '1.5px solid rgba(99,102,241,0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <ShieldCheck size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Aktifkan Face ID / Biometrik</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Absen lebih aman — verifikasi wajah sebelum kirim</div>
        </div>
      </div>
      <motion.button
        className="btn btn-primary btn-sm"
        onClick={setup}
        disabled={loading}
        whileTap={{ scale: 0.95 }}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {loading
          ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Mendaftarkan...</>
          : <><ShieldCheck size={14} /> Daftarkan Face ID / Biometrik</>
        }
      </motion.button>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
        🔒 Data biometrik tidak pernah keluar dari HP kamu
      </div>
    </motion.div>
  )
}

// ─── Big Tap Button ────────────────────────────────────────────────────────────
function MyAbsenButton({ onStatusChange }) {
  const [status,   setStatus]   = useState(() => getStatusToday(MY_NAME))
  const [loading,  setLoading]  = useState(false)
  const [ripple,   setRipple]   = useState(false)
  const [hasCred,  setHasCred]  = useState(!!localStorage.getItem(CRED_KEY))
  const [authMode, setAuthMode] = useState('checking') // 'face-id' | 'tap' | 'checking'

  useEffect(() => {
    // Cek apakah platform auth tersedia dan credential sudah ada
    checkPlatformAuth().then(available => {
      const cred = localStorage.getItem(CRED_KEY)
      if (available && cred) setAuthMode('face-id')
      else if (available && !cred) setAuthMode('setup-needed')
      else setAuthMode('tap')
    })
  }, [hasCred])

  const handleTap = async () => {
    if (loading) return
    if (status === 'pulang') {
      toast('Kamu sudah absen pulang hari ini! 👋', { icon: '✅' })
      return
    }

    const nextStatus    = status === 'hadir' ? 'Pulang' : 'Hadir'
    const nextStatusKey = nextStatus.toLowerCase()

    setLoading(true)
    setRipple(true)
    setTimeout(() => setRipple(false), 700)

    try {
      // Face ID verification dulu jika tersedia
      if (authMode === 'face-id') {
        const credId = localStorage.getItem(CRED_KEY)
        const ok = await verifyFaceID(credId).catch(err => {
          if (err.name === 'NotAllowedError') throw new Error('Verifikasi dibatalkan')
          throw err
        })
        if (!ok) throw new Error('Verifikasi gagal')
      }

      await submitAbsen(MY_NAME, nextStatus)
      recordStatus(MY_NAME, nextStatusKey)
      setStatus(nextStatusKey)
      onStatusChange?.()

      toast.success(
        nextStatus === 'Hadir'
          ? `✅ Hadir tercatat! Semangat bekerja, ${MY_NAME}! 💪`
          : `👋 Pulang tercatat! Sampai besok, ${MY_NAME}!`,
        { duration: 4000 }
      )
    } catch (err) {
      toast.error(err.message || 'Gagal kirim absen. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const isHadir  = status === 'hadir'
  const isPulang = status === 'pulang'
  const notYet   = !status

  const colors = {
    bg:   isPulang ? null
                   : isHadir ? 'linear-gradient(135deg, #10b981, #059669)'
                   : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    glow: isPulang ? 'none'
                   : isHadir ? '0 0 60px rgba(16,185,129,0.35), 0 16px 48px rgba(16,185,129,0.2)'
                   : '0 0 60px rgba(59,130,246,0.35), 0 16px 48px rgba(59,130,246,0.2)',
    ring: isPulang ? 'rgba(99,102,241,0.1)'
                   : isHadir ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
  }

  const BtnIcon = () => {
    if (loading) return (
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
        style={{ width: 44, height: 44, border: '4px solid rgba(255,255,255,0.25)', borderTopColor: 'white', borderRadius: '50%' }} />
    )
    if (isPulang) return <>
      <CheckCircle2 size={50} style={{ color: '#6366f1' }} strokeWidth={1.5} />
      <span style={{ fontSize: 12, fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>Selesai</span>
    </>
    return <>
      <Fingerprint size={54} color="white" strokeWidth={1.5} />
      <span style={{ color: 'white', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {notYet ? 'Tap Hadir' : 'Tap Pulang'}
      </span>
    </>
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      {/* Status badge */}
      <div style={{ marginBottom: 20 }}>
        <AnimatePresence mode="wait">
          {notYet && (
            <motion.div key="belum" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
              {authMode === 'face-id' ? '👤 Tap → Face ID → Hadir' : '👆 Tap tombol untuk Hadir'}
            </motion.div>
          )}
          {isHadir && (
            <motion.div key="hadir" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(16,185,129,0.12)', color: '#10b981',
                padding: '6px 18px', borderRadius: 999, fontSize: 14, fontWeight: 800,
                border: '1.5px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle2 size={16} />
              {authMode === 'face-id' ? 'Hadir (verif. Face ID) — tap lagi untuk Pulang' : 'Sudah Hadir — tap lagi untuk Pulang'}
            </motion.div>
          )}
          {isPulang && (
            <motion.div key="pulang" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(99,102,241,0.12)', color: '#6366f1',
                padding: '6px 18px', borderRadius: 999, fontSize: 14, fontWeight: 800,
                border: '1.5px solid rgba(99,102,241,0.2)' }}>
              <LogOut size={16} /> Sudah Pulang — Selamat istirahat!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Button circle */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {!isPulang && [0, 1].map(i => (
          <motion.div key={i}
            style={{ position: 'absolute', inset: -(14 + i * 18), borderRadius: '50%', background: colors.ring }}
            animate={{ scale: [1, 1.07 + i * 0.04, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.5 + i * 0.6, ease: 'easeInOut', delay: i * 0.6 }}
          />
        ))}

        <motion.button
          id="absen-tap-btn"
          onClick={handleTap}
          disabled={loading || isPulang || authMode === 'checking'}
          whileHover={!isPulang ? { scale: 1.06 } : {}}
          whileTap={!isPulang ? { scale: 0.91 } : {}}
          style={{
            width: 190, height: 190, borderRadius: '50%',
            background: isPulang ? 'var(--bg-tertiary)' : colors.bg,
            border: isPulang ? '2px solid var(--border)' : 'none',
            cursor: isPulang ? 'default' : 'pointer',
            boxShadow: colors.glow,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            position: 'relative', overflow: 'hidden',
            transition: 'background 0.5s, box-shadow 0.5s',
          }}
        >
          <AnimatePresence>
            {ripple && (
              <motion.div
                initial={{ scale: 0, opacity: 0.5 }}
                animate={{ scale: 3.5, opacity: 0 }}
                exit={{}}
                style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }}
              />
            )}
          </AnimatePresence>
          <BtnIcon />
        </motion.button>
      </div>

      {/* Auth mode indicator */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {authMode === 'face-id' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(99,102,241,0.08)', color: '#6366f1',
            padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
            border: '1px solid rgba(99,102,241,0.2)' }}>
            <ShieldCheck size={12} /> Dilindungi Face ID
          </div>
        )}
        {authMode === 'tap' && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mode tap biasa</span>
        )}
        {authMode === 'setup-needed' && (
          <span style={{ fontSize: 11, color: '#f59e0b' }}>⚠ Daftarkan Face ID di atas dulu</span>
        )}
      </div>
    </div>
  )
}

// ─── Absenkan Orang Lain ──────────────────────────────────────────────────────
function AbsenkanOrang({ onStatusChange }) {
  const [open,       setOpen]      = useState(false)
  const [loadingKey, setLKey]      = useState(null)
  const [, forceRender]            = useState(0)
  const refresh = () => { forceRender(n => n + 1); onStatusChange?.() }

  const handle = async (nama, statusStr) => {
    const key = `${nama}-${statusStr}`
    setLKey(key)
    try {
      await submitAbsen(nama, statusStr)
      recordStatus(nama, statusStr.toLowerCase())
      refresh()
      toast.success(`✅ ${nama}: ${statusStr}`)
    } catch { toast.error(`Gagal absen ${nama}`) }
    finally { setLKey(null) }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Absenkan Orang Lain</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bantuin teman yang minta diabsenkan</div>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: '1px solid var(--border)', padding: '8px 16px 14px' }}>
              {NAMA_LIST.filter(n => n !== MY_NAME).map((nama, i) => {
                const s = loadLog()[getTodayKey()]?.[nama]
                const isH = s === 'hadir', isP = s === 'pulang'
                return (
                  <motion.div key={nama}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 4px', borderBottom: i < NAMA_LIST.length - 2 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{nama}</div>
                      <div style={{ fontSize: 11, marginTop: 2 }}>
                        {isP ? <span style={{ color: '#6366f1', fontWeight: 700 }}>✓ Pulang</span>
                          : isH ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Hadir</span>
                          : <span style={{ color: 'var(--text-muted)' }}>Belum absen</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!isH && !isP && <>
                        <motion.button className="btn btn-sm" whileTap={{ scale: 0.93 }}
                          disabled={loadingKey === `${nama}-Hadir`}
                          onClick={() => handle(nama, 'Hadir')}
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '4px 11px', fontSize: 12 }}>
                          {loadingKey === `${nama}-Hadir` ? '...' : '✓ Hadir'}
                        </motion.button>
                        <motion.button className="btn btn-sm" whileTap={{ scale: 0.93 }}
                          disabled={loadingKey === `${nama}-Pulang`}
                          onClick={() => handle(nama, 'Pulang')}
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', padding: '4px 11px', fontSize: 12 }}>
                          {loadingKey === `${nama}-Pulang` ? '...' : '✈ Pulang'}
                        </motion.button>
                      </>}
                      {isH && !isP && (
                        <motion.button className="btn btn-sm" whileTap={{ scale: 0.93 }}
                          disabled={loadingKey === `${nama}-Pulang`}
                          onClick={() => handle(nama, 'Pulang')}
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', padding: '4px 11px', fontSize: 12 }}>
                          {loadingKey === `${nama}-Pulang` ? '...' : '✈ Pulang'}
                        </motion.button>
                      )}
                      {isP && <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 600 }}>Selesai ✓</span>}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Rekap Hari Ini ───────────────────────────────────────────────────────────
function RekapHariIni({ version }) {
  const log    = getTodayLog()
  const hadir  = NAMA_LIST.filter(n => log[n] === 'hadir' || log[n] === 'pulang').length
  const pulang = NAMA_LIST.filter(n => log[n] === 'pulang').length
  const belum  = NAMA_LIST.filter(n => !log[n]).length

  return (
    <div className="card">
      <div className="card-header">
        <Clock size={18} style={{ color: 'var(--accent)' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Rekap Hari Ini</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <a href={`https://docs.google.com/forms/d/e/${FORM_ID}/viewform`} target="_blank" rel="noreferrer"
          className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>
          <ExternalLink size={13} /> Form
        </a>
      </div>

      <div className="card-body" style={{ padding: '12px 20px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { label: `Hadir ${hadir}`, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
            { label: `Pulang ${pulang}`, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
            { label: `Belum ${belum}`, color: 'var(--text-muted)', bg: 'var(--bg-tertiary)' },
          ].map(c => (
            <div key={c.label} style={{ padding: '4px 12px', borderRadius: 99, background: c.bg, fontSize: 12, fontWeight: 700, color: c.color }}>{c.label}</div>
          ))}
        </div>

        {NAMA_LIST.map(nama => {
          const s = log[nama]
          return (
            <div key={nama} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 10, marginBottom: 5,
              background: s === 'pulang' ? 'rgba(99,102,241,0.05)' : s === 'hadir' ? 'rgba(16,185,129,0.05)' : 'var(--bg-tertiary)',
              border: `1px solid ${s === 'pulang' ? 'rgba(99,102,241,0.15)' : s === 'hadir' ? 'rgba(16,185,129,0.15)' : 'var(--border)'}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{nama}</span>
              <span style={{ fontSize: 11, fontWeight: 700,
                color: s === 'pulang' ? '#6366f1' : s === 'hadir' ? '#10b981' : 'var(--text-muted)' }}>
                {s === 'pulang' ? '✈ Pulang' : s === 'hadir' ? '✓ Hadir' : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── NFC + Tips ───────────────────────────────────────────────────────────────
function TipsNFC() {
  const [open, setOpen] = useState(false)
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Nfc size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Cara Pakai NFC Sticker (iPhone 15)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tap sticker NFC → buka halaman absen otomatis</div>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', lineHeight: 1.7, fontSize: 13, color: 'var(--text-secondary)' }}>
              {[
                { n: '1', t: 'Beli NFC tag sticker', d: 'NTAG215 atau NTAG216. Harga ~Rp 5.000–15.000/pcs di Tokopedia/Shopee.' },
                { n: '2', t: 'Tulis URL ke NFC tag', d: 'Pakai app "NFC Tools" (gratis, App Store). Tulis URL halaman ini ke tag.' },
                { n: '3', t: 'Tempel & Tap!', d: 'Tempel sticker di meja. Tap iPhone → Safari buka halaman ini → Face ID → Hadir otomatis.' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f59e0b', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>
                    {s.n}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.t}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.d}</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, fontSize: 12, color: '#4f46e5', marginTop: 4 }}>
                💡 Install Si Rekap ke Home Screen (PWA) supaya buka langsung tanpa browser address bar
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Absen() {
  const [online,  setOnline]  = useState(navigator.onLine)
  const [version, setVersion] = useState(0)
  const [hasCred, setHasCred] = useState(!!localStorage.getItem(CRED_KEY))

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const refresh = useCallback(() => setVersion(v => v + 1), [])

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ maxWidth: 540, margin: '0 auto' }}
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <Fingerprint size={22} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>Absensi Digital</h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: online ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: online ? '#10b981' : '#ef4444' }}>
            {online ? <Wifi size={10} /> : <WifiOff size={10} />}
            {online ? 'Online' : 'Offline'}
          </div>
        </div>
        <LiveClock />
      </motion.div>

      {/* Face ID Setup */}
      {!hasCred && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <FaceIDSetup onSetupDone={() => setHasCred(true)} />
        </motion.div>
      )}

      {/* Big Tap Button */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 280 }}>
        <MyAbsenButton onStatusChange={refresh} />
      </motion.div>

      {/* Absenkan orang lain */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <AbsenkanOrang onStatusChange={refresh} />
      </motion.div>

      {/* NFC Tips */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <TipsNFC />
      </motion.div>

      {/* Rekap */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <RekapHariIni version={version} />
      </motion.div>

      {/* Info keamanan */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12,
          background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)',
          fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        🔒 <strong>Data aman:</strong> Biometrik tidak pernah meninggalkan HP kamu (WebAuthn standar W3C).
        Hanya signature kriptografis yang diverifikasi secara lokal.
        Absen dikirim ke Google Form via HTTPS.
      </motion.div>
    </motion.div>
  )
}
