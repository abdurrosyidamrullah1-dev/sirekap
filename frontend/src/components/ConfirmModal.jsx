import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react'

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Hapus',
  cancelText = 'Batal',
  isLoading = false
}) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isLoading ? onClose : undefined}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '24px',
            width: '100%',
            maxWidth: 400,
            position: 'relative',
            zIndex: 1,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: 14, 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: 'rgb(239, 68, 68)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertTriangle size={24} />
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                {title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {message}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'flex-end' }}>
            <button 
              onClick={onClose}
              disabled={isLoading}
              className="btn btn-secondary"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none' }}
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              disabled={isLoading}
              className="btn"
              style={{ 
                background: 'rgb(239, 68, 68)', 
                color: 'white', 
                border: 'none',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              {isLoading ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
              {isLoading ? 'Menghapus...' : confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
