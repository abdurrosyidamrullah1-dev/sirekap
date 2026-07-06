import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Package, Clock, CheckCircle2, AlertCircle, ChevronRight, Calendar, FileText } from 'lucide-react'
import { getStatusConfig } from '../lib/supabase'

export default function OrderCard({ order, index = 0 }) {
  const navigate = useNavigate()
  const cfg = getStatusConfig(order.status)
  const itemCount = order.order_items?.length || 0
  const fileCount = order.order_files?.length || 0

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <motion.tr
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
      onClick={() => navigate(`/orders/${order.id}`)}
      style={{ cursor: 'pointer' }}
      whileHover={{ backgroundColor: 'var(--accent-light)' }}
    >
      <td>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          {order.customer_name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          #{order.id.slice(0, 8).toUpperCase()}
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2" style={{ marginBottom: itemCount > 0 ? 4 : 0 }}>
          <Package size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{itemCount} item</span>
        </div>
        {itemCount > 0 && (
          <div style={{ display: 'flex', gap: 6, fontSize: 11, fontWeight: 600 }}>
            {(order.order_items?.filter(it => it.status === 'done').length || 0) > 0 && (
              <span style={{ color: 'var(--success)' }}>{order.order_items.filter(it => it.status === 'done').length} Selesai</span>
            )}
            {(order.order_items?.filter(it => it.status === 'in_progress').length || 0) > 0 && (
              <span style={{ color: 'var(--blue-500)' }}>{order.order_items.filter(it => it.status === 'in_progress').length} Proses</span>
            )}
            {(order.order_items?.filter(it => it.status === 'pending').length || 0) > 0 && (
              <span style={{ color: 'var(--warning)' }}>{order.order_items.filter(it => it.status === 'pending').length} Pending</span>
            )}
          </div>
        )}
      </td>
      <td>
        <span className={`badge badge-${order.status}`} style={{ background: cfg.color + '20', color: cfg.color }}>
          {cfg.label}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(order.deadline)}</span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <FileText size={13} style={{ color: fileCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
          <span style={{ fontSize: 13, color: fileCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
            {fileCount} file
          </span>
        </div>
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {formatDate(order.created_at)}
      </td>
      <td>
        <motion.div whileHover={{ x: 3 }} style={{ color: 'var(--text-muted)' }}>
          <ChevronRight size={16} />
        </motion.div>
      </td>
    </motion.tr>
  )
}
