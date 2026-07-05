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

function StatusDot({ status, size = 10 }) {
  const cfg = getStatusConfig(status)
  return (
    <motion.div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: cfg.color, flexShrink: 0,
        boxShadow: `0 0 ${size}px ${cfg.color}60`,
      }}
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ repeat: Infinity, duration: 2 }}
    />
  )
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
  const [showTransition, setShowTransition] = useState(false)
  const [targetStatus, setTargetStatus] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const timeline = order.order_timeline || []
  const allowed = TRANSITIONS[order.status] || []
  const currentCfg = getStatusConfig(order.status)
  const CurrentIcon = STATUS_ICONS[order.status] || Clock

  const handleTransition = async () => {
    if (!targetStatus) return
    setLoading(true)
    try {
      await updateOrderStatus(order.id, targetStatus, note)
      onStatusChanged(targetStatus)
      setShowTransition(false)
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
      {/* Current Status + Action Button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', background: currentCfg.color + '12',
        borderRadius: 'var(--radius-md)', border: `1.5px solid ${currentCfg.color}30`,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: currentCfg.color + '25',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CurrentIcon size={18} style={{ color: currentCfg.color }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: currentCfg.color }}>{currentCfg.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentCfg.desc}</div>
          </div>
        </div>
        {allowed.length > 0 && (
          <motion.button
            className="btn btn-primary btn-sm"
            onClick={() => setShowTransition(!showTransition)}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          >
            Ubah Status <ChevronDown size={13} style={{ transform: showTransition ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </motion.button>
        )}
      </div>

      {/* Transition Panel */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 20 }}
          >
            <div style={{
              background: 'var(--bg-secondary)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Pilih status baru:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {allowed.map(s => {
                  const cfg = getStatusConfig(s)
                  const Icon = STATUS_ICONS[s] || Clock
                  return (
                    <motion.button
                      key={s}
                      onClick={() => setTargetStatus(s)}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '8px 14px', borderRadius: 'var(--radius-md)',
                        border: `2px solid ${targetStatus === s ? cfg.color : 'var(--border)'}`,
                        background: targetStatus === s ? cfg.color + '15' : 'var(--bg-tertiary)',
                        color: targetStatus === s ? cfg.color : 'var(--text-secondary)',
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Icon size={14} />
                      {cfg.label}
                    </motion.button>
                  )
                })}
              </div>

              {targetStatus && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      <MessageSquare size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Catatan (opsional):
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
                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowTransition(false); setTargetStatus(null); setNote('') }}>
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
                      Konfirmasi → {getStatusConfig(targetStatus)?.label}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Pipeline */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Alur Status
        </div>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
          {ORDER_STATUSES.filter(s => s.value !== 'cancelled').map((s, i, arr) => {
            const isActive = order.status === s.value
            const isPast = timeline.some(t => t.status === s.value)
            const Icon = STATUS_ICONS[s.value] || Clock
            return (
              <div key={s.value} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 0 }}>
                <motion.div
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '6px 4px', minWidth: 56,
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isActive ? s.color : isPast ? s.color + '30' : 'var(--bg-tertiary)',
                    border: `2px solid ${isActive ? s.color : isPast ? s.color + '60' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s',
                  }}>
                    <Icon size={14} style={{ color: isActive ? 'white' : isPast ? s.color : 'var(--text-muted)' }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: isActive ? 800 : 500, color: isActive ? s.color : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                    {s.label}
                  </span>
                </motion.div>
                {i < arr.length - 1 && (
                  <div style={{
                    flex: 1, height: 2,
                    background: isPast ? s.color + '50' : 'var(--border)',
                    marginTop: -10, transition: 'background 0.3s',
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

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
