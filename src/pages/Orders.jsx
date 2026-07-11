import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, PlusCircle, ClipboardList, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getOrders, deleteOrder, supabase } from '../lib/supabase'
import OrderCard from '../components/OrderCard'
import Pagination from '../components/Pagination'
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

const PER_PAGE = 10

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const navigate = useNavigate()

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await getOrders({ status, search, role: 'designer' })
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const filteredData = data.filter(order => {
        if (order.status === 'done' || order.status === 'cancelled') {
          return new Date(order.updated_at || order.created_at) >= sevenDaysAgo
        }
        return true
      })
      setOrders(filteredData)
      setPage(1) // reset ke halaman 1 saat filter berubah
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `order_role=eq.designer` }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [search, status])

  // Pagination slice
  const totalPages = Math.ceil(orders.length / PER_PAGE)
  const paginatedOrders = orders.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Export PDF
  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Laporan Semua Orderan', 14, 18)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 26)
      doc.text(`Total: ${orders.length} orderan`, 14, 32)

      autoTable(doc, {
        startY: 38,
        head: [['No', 'Customer', 'Status', 'Item', 'Deadline', 'Dibuat']],
        body: orders.map((o, i) => [
          i + 1,
          o.customer_name,
          o.status,
          (o.order_items?.length || 0) + ' item',
          formatDate(o.deadline),
          formatDate(o.created_at),
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 244, 255] },
      })

      doc.save(`orderan-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF berhasil diunduh!')
    } catch (e) {
      toast.error('Gagal export PDF: ' + e.message)
    }
    setShowExportMenu(false)
  }

  // Export Excel
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(orders.map((o, i) => ({
        'No': i + 1,
        'Nama Customer': o.customer_name,
        'Status': o.status,
        'Jumlah Item': o.order_items?.length || 0,
        'Item Selesai': o.order_items?.filter(it => it.status === 'done').length || 0,
        'Deadline': formatDate(o.deadline),
        'Tanggal Dibuat': formatDate(o.created_at),
        'Catatan': o.notes || '',
      })))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Orderan')
      XLSX.writeFile(wb, `orderan-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel berhasil diunduh!')
    } catch (e) {
      toast.error('Gagal export Excel: ' + e.message)
    }
    setShowExportMenu(false)
  }

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => showExportMenu && setShowExportMenu(false)}
    >
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Semua Orderan 📋</h1>
          <p>
            {loading ? 'Memuat...' : `${orders.length} orderan ditemukan`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Export Button */}
          <div style={{ position: 'relative' }}>
            <motion.button
              className="btn btn-secondary"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu) }}
            >
              <Download size={16} /> Export
            </motion.button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 8, minWidth: 160,
                    boxShadow: 'var(--shadow-lg)', zIndex: 100,
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                >
                  <button onClick={exportPDF}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', width: '100%', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <FileText size={15} style={{ color: '#ef4444' }} /> Export PDF
                  </button>
                  <button onClick={exportExcel}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', width: '100%', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <FileSpreadsheet size={15} style={{ color: '#10b981' }} /> Export Excel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
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
          <>
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
                    {paginatedOrders.map((order, i) => (
                      <OrderCard key={order.id} order={order} index={i} />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            <Pagination
              total={orders.length}
              perPage={PER_PAGE}
              page={page}
              onChange={setPage}
            />
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

