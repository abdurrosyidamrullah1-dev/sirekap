import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [showOnline, setShowOnline] = useState(false)

  useEffect(() => {
    const handleOffline = () => { setIsOffline(true); setShowOnline(false) }
    const handleOnline = () => { setIsOffline(false); setShowOnline(true); setTimeout(() => setShowOnline(false), 3000) }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => { window.removeEventListener('offline', handleOffline); window.removeEventListener('online', handleOnline) }
  }, [])

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div key="offline" initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'linear-gradient(90deg, #ef4444, #dc2626)', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }}>
          <WifiOff size={15} />Kamu sedang offline — menampilkan data terakhir yang tersimpan
        </motion.div>
      )}
      {showOnline && !isOffline && (
        <motion.div key="online" initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'linear-gradient(90deg, #10b981, #059669)', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }}>
          <Wifi size={15} />Koneksi kembali — data akan diperbarui otomatis ✓
        </motion.div>
      )}
    </AnimatePresence>
  )
}
