import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, PlusCircle, ClipboardList, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getOrders, deleteOrder, supabase } from '../lib/supabase'
import OrderCard from '../components/OrderCard'
import toast from 'react-hot-toast'

const STATUS_FILTERS = [
  { key: 'all',         label: 'Semua' },
  { key: 'pending',     label: 'Pending' },
  { key: 'in_progress', label: 'Dikerjakan' },
  { key: 'review',      label: 'Review' },
  { key: 'revision',    label: 'Revisi' },
  { key: 'approved',    label: 'Approved' },
  { key: 'done',        label: 'Selesai' },
  { key: 'cancelled',   label: 'Dibatalkan' },
]

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const navigate = useNavigate()

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await getOrders({ status, search })
      setOrders(data)
    } catch (e) {
      toast.error('Gagal memuat orderan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 300)

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [search, status])

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Semua Orderan 📋</h1>
          <p>
            {loading ? 'Memuat...' : `${orders.length} orderan ditemukan`}
          </p>
        </div>
        <motion.button
          className="btn btn-primary"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/orders/new')}
        >
          <PlusCircle size={16} />
          Tambah Orderan
        </motion.button>
      </div>

      {/* Search + Filter */}
      <div className="search-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" />
          <input
            className="form-input"
            placeholder="Cari nama customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          {STATUS_FILTERS.map(f => (
            <motion.button
              key={f.key}
              className={`chip ${status === f.key ? 'active' : ''}`}
              onClick={() => setStatus(f.key)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Table */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {loading ? (
          <div style={{ padding: 24 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 120, height: 18 }} />
                <div className="skeleton" style={{ width: 60, height: 18 }} />
                <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 99 }} />
                <div className="skeleton" style={{ width: 80, height: 18 }} />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <ClipboardList size={28} />
            </div>
            <h3>Belum ada orderan</h3>
            <p>Coba ubah filter atau tambah orderan baru</p>
            <motion.button
              className="btn btn-primary mt-3"
              onClick={() => navigate('/orders/new')}
              whileHover={{ scale: 1.04 }}
            >
              <PlusCircle size={15} /> Tambah Orderan
            </motion.button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="order-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>File Desain</th>
                  <th>Dibuat</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {orders.map((order, i) => (
                    <OrderCard key={order.id} order={order} index={i} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
