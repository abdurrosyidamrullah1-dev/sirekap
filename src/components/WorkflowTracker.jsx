import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  Clock, Hammer, Eye, RotateCcw, ThumbsUp, CheckCircle2,
  XCircle, ChevronDown, MessageSquare, Send
} from 'lucide-react'
import { ORDER_STATUSES, getStatusConfig, updateOrderStatus } from '../lib/supabase'
import toast from 'react-hot-toast'

const STATUS_ICONS = {
  pending:     Clock,
  in_progress: Hammer,
  review:      Eye,
  revision:    RotateCcw,
  approved:    ThumbsUp,
  done:        CheckCircle2,
  cancelled:   XCircle,
}

// Allowed transitions (from → to[])
const TRANSITIONS = {
  pending:     ['in_progress', 'cancelled'],
  in_progress: ['review', 'cancelled'],
  review:      ['approved', 'revision', 'in_progress'],
  revision:    ['in_progress', 'cancelled'],
  approved:    ['done', 'revision'],
  done:        [],
  cancelled:   ['pending'],
}

function TimelineItem({ event, isLast }) {
  const cfg = getStatusConfig(event.status)
  const Icon = STATUS_ICONS[event.status] || Clock
  return (
    <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
      {/* Line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 15, top: 30,
          width: 2, bottom: -8,
          background: 'var(--border)',
        }} />
      )}
      {/* Icon */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: cfg.color + '20',
        border: `2px solid ${cfg.color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1,
      }}>
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      {/* Content */}
      <div style={{ flex: 1, paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{cfg.label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {new Date(event.created_at).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </span>
        </div>
        {event.note && (
          <div style={{
            fontSize: 13, color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            padding: '7px 11px', borderRadius: 8,
            borderLeft: `3px solid ${cfg.color}`,
          }}>
            {event.note}
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkflowTracker({ order, onStatusChanged }) {
  const [targetStatus, setTargetStatus] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const timeline = order.order_timeline || []
  const allowed = TRANSITIONS[order.status] || []
  const currentCfg = getStatusConfig(order.status)

  const handleTransition = async () => {
    if (!targetStatus) return
    setLoading(true)
    try {
      await updateOrderStatus(order.id, targetStatus, note)
      onStatusChanged(targetStatus)
      setTargetStatus(null)
      setNote('')
      toast.success(`Status diubah ke "${getStatusConfig(targetStatus).label}"`)
    } catch (e) {
      toast.error('Gagal ubah status: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Visual Pipeline Clickable */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Alur Status (Klik untuk mengubah status)
        </div>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
          {ORDER_STATUSES.filter(s => s.value !== 'cancelled').map((s, i, arr) => {
            const isActive = order.status === s.value
            const isPast = timeline.some(t => t.status === s.value)
            const isTarget = targetStatus === s.value
            const isAllowed = allowed.includes(s.value)
            const Icon = STATUS_ICONS[s.value] || Clock

            return (
              <div key={s.value} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 0 }}>
                <motion.div
                  onClick={() => {
                    // Hanya izinkan status yang berbeda
                    if (!isActive) {
                      setTargetStatus(isTarget ? null : s.value)
                      setNote('')
                    }
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '6px 4px', minWidth: 56,
                    cursor: isActive ? 'default' : 'pointer',
                    opacity: isActive || isAllowed || isTarget ? 1 : 0.5
                  }}
                  whileHover={{ scale: isActive ? 1 : 1.05 }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isActive ? s.color : isTarget ? s.color + '40' : isPast ? s.color + '30' : 'var(--bg-tertiary)',
                    border: `2px solid ${isActive || isTarget ? s.color : isPast ? s.color + '60' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s',
                  }}>
                    <Icon size={16} style={{ color: isActive ? 'white' : (isPast || isTarget) ? s.color : 'var(--text-muted)' }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: isActive || isTarget ? 800 : 500, color: isActive || isTarget ? s.color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                    {s.label}
                  </span>
                </motion.div>
                {i < arr.length - 1 && (
                  <div style={{
                    flex: 1, height: 2,
                    background: isPast || (isTarget && timeline.some(t => t.status === arr[i].value)) ? s.color + '50' : 'var(--border)',
                    marginTop: -10, transition: 'background 0.3s',
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Cancelled standalone button */}
      {order.status !== 'cancelled' && (
        <div style={{ marginBottom: 20 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--danger)', fontSize: 12 }}
            onClick={() => setTargetStatus(targetStatus === 'cancelled' ? null : 'cancelled')}
          >
            <XCircle size={14} style={{ marginRight: 6 }} />
            Batalkan Orderan
          </button>
        </div>
      )}
      
      {order.status === 'cancelled' && (
        <div style={{ marginBottom: 20, padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, color: '#ef4444', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <XCircle size={16} /> Orderan Dibatalkan
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 11 }} onClick={() => setTargetStatus('pending')}>Ubah ke Pending</button>
        </div>
      )}

      {/* Target Status Panel */}
      <AnimatePresence>
        {targetStatus && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 20 }}
          >
            <div style={{
              background: 'var(--bg-secondary)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: 16,
              borderColor: getStatusConfig(targetStatus).color + '60'
            }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <MessageSquare size={13} style={{ display: 'inline', marginRight: 5 }} />
                  Konfirmasi ubah ke <strong style={{ color: getStatusConfig(targetStatus).color }}>{getStatusConfig(targetStatus).label}</strong>. Tambahkan catatan (opsional):
                  {targetStatus === 'revision' && <span style={{ color: 'var(--warning)', marginLeft: 5 }}>*wajib untuk revisi</span>}
                </div>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder={
                    targetStatus === 'revision' ? 'Jelaskan apa yang perlu direvisi...' :
                    targetStatus === 'approved' ? 'Catatan approval dari pelanggan...' :
                    'Catatan tambahan...'
                  }
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  style={{ fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setTargetStatus(null); setNote('') }}>
                  Batal
                </button>
                <motion.button
                  className="btn btn-primary btn-sm"
                  onClick={handleTransition}
                  disabled={loading || (targetStatus === 'revision' && !note.trim())}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  style={{ background: `linear-gradient(135deg, ${getStatusConfig(targetStatus).color}, ${getStatusConfig(targetStatus).color}cc)` }}
                >
                  {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Send size={13} />}
                  Simpan Status
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Riwayat Status
        </div>
        {timeline.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>Belum ada riwayat</div>
        ) : (
          <div>
            {[...timeline].reverse().map((ev, i) => (
              <motion.div key={ev.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <TimelineItem event={ev} isLast={i === timeline.length - 1} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
