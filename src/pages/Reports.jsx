import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, TrendingUp, Package, Calendar, Download, FileSpreadsheet, FileText, Printer, Store, DollarSign } from 'lucide-react'
import { getOrders, supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444']
const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'Dikerjakan',
  done: 'Selesai',
  cancelled: 'Dibatalkan',
}

export default function Reports() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCustomer, setFilterCustomer] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getOrders()
        setOrders(data)
      } catch (e) {
        toast.error('Gagal memuat laporan')
      } finally {
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel('public:orders:reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        load()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = orders.filter(o => {
    const d = new Date(o.created_at)
    const inDate = d >= new Date(dateFrom) && d <= new Date(dateTo + 'T23:59:59')
    const inStatus = filterStatus === 'all' || o.status === filterStatus
    const inCustomer = !filterCustomer.trim() ||
      o.customer_name.toLowerCase().includes(filterCustomer.toLowerCase())
    return inDate && inStatus && inCustomer
  })

  const totalRevenue = filtered
    .flatMap(o => o.order_items || [])
    .reduce((s, it) => s + ((it.unit_price || 0) * (it.quantity || 1)), 0)

  // Pie data
  const statusCounts = ['pending','in_progress','done','cancelled'].map(s => ({
    name: STATUS_LABELS[s],
    value: filtered.filter(o => o.status === s).length,
  })).filter(d => d.value > 0)

  // Bar data — orders per day in range
  const dayMap = {}
  filtered.forEach(o => {
    const d = new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    dayMap[d] = (dayMap[d] || 0) + 1
  })
  const barData = Object.entries(dayMap).map(([date, count]) => ({ date, count }))

  // Top customers
  const customerMap = {}
  filtered.forEach(o => {
    customerMap[o.customer_name] = (customerMap[o.customer_name] || 0) + 1
  })
  const topCustomers = Object.entries(customerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Produksi Laporan
  const vendorCountMap = {}
  const machineCountMap = {}

  filtered.forEach(o => {
    o.order_items?.forEach(item => {
      if (item.production_type === 'outsourced' && item.production_location) {
        vendorCountMap[item.production_location] = (vendorCountMap[item.production_location] || 0) + (item.quantity || 1)
      } else if (item.production_type === 'in_house' && item.production_location) {
        machineCountMap[item.production_location] = (machineCountMap[item.production_location] || 0) + (item.quantity || 1)
      }
    })
  })

  const topVendors = Object.entries(vendorCountMap).sort((a, b) => b[1] - a[1])
  const topMachines = Object.entries(machineCountMap).sort((a, b) => b[1] - a[1])

  const formatDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

  const CustomTooltipPie = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 13 }}>
          <strong>{payload[0].name}</strong>: {payload[0].value} orderan
        </div>
      )
    }
    return null
  }

  const exportExcel = () => {
    if (filtered.length === 0) return toast.error('Tidak ada data untuk di-export')
    
    const data = filtered.map(o => ({
      'Tanggal': new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      'Customer': o.customer_name,
      'Total Item': o.order_items?.length || 0,
      'Total File': o.order_files?.length || 0,
      'Status': STATUS_LABELS[o.status] || o.status,
      'Catatan': o.notes || '-'
    }))

    const machineData = topMachines.map(([name, count]) => ({
      'Nama Mesin / Vendor': name,
      'Tipe Produksi': 'Cetak Dalam (Mesin)',
      'Total Item (Pieces)': count
    }))
    const vendorData = topVendors.map(([name, count]) => ({
      'Nama Mesin / Vendor': name,
      'Tipe Produksi': 'Cetak Luar (Vendor)',
      'Total Item (Pieces)': count
    }))
    const produksiData = [...machineData, ...vendorData]

    const ws = XLSX.utils.json_to_sheet(data)
    const wsProduksi = XLSX.utils.json_to_sheet(produksiData)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Orderan")
    XLSX.utils.book_append_sheet(wb, wsProduksi, "Rekap Produksi")
    
    XLSX.writeFile(wb, `Rekap_Orderan_${dateFrom}_sd_${dateTo}.xlsx`)
  }

  const exportPDF = () => {
    if (filtered.length === 0) return toast.error('Tidak ada data untuk di-export')
    
    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.text(`Rekap Orderan Si Rekap`, 14, 15)
    doc.setFontSize(10)
    doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, 14, 22)

    const tableData = filtered.map(o => [
      new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      o.customer_name,
      (o.order_items?.length || 0) + ' item',
      STATUS_LABELS[o.status] || o.status,
      o.notes || '-'
    ])

    doc.autoTable({
      startY: 28,
      head: [['Tanggal', 'Customer', 'Jml Item', 'Status', 'Catatan']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] }, // Dark header
    })

    let currentY = doc.lastAutoTable.finalY + 15
    
    if (topMachines.length > 0) {
      doc.setFontSize(12)
      doc.text(`Rekap Penggunaan Mesin (Cetak Dalam)`, 14, currentY)
      doc.autoTable({
        startY: currentY + 4,
        head: [['Nama Mesin', 'Total Item (Pieces)']],
        body: topMachines,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [16, 185, 129] }, 
      })
      currentY = doc.lastAutoTable.finalY + 15
    }

    if (topVendors.length > 0) {
      doc.setFontSize(12)
      doc.text(`Rekap Penggunaan Cetak Luar (Vendor)`, 14, currentY)
      doc.autoTable({
        startY: currentY + 4,
        head: [['Nama Vendor', 'Total Item (Pieces)']],
        body: topVendors,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [245, 158, 11] },
      })
    }

    doc.save(`Rekap_Orderan_${dateFrom}_sd_${dateTo}.pdf`)
  }

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-left">
          <h1>Laporan 📊</h1>
          <p>Analisis dan statistik orderan kamu</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={exportExcel} className="btn" style={{ background: '#10b981', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={16} /> Export Excel
          </button>
          <button onClick={exportPDF} className="btn" style={{ background: '#ef4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filter */}
      <motion.div
        className="card"
        style={{ marginBottom: 20 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
              <label className="form-label">Dari Tanggal</label>
              <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
              <label className="form-label">Sampai Tanggal</label>
              <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 130 }}>
              <label className="form-label">Status</label>
              <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">Semua Status</option>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
              <label className="form-label">Customer</label>
              <input
                className="form-input"
                placeholder="Cari nama customer..."
                value={filterCustomer}
                onChange={e => setFilterCustomer(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ padding: '10px 18px', background: 'var(--accent-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>
                {filtered.length} Orderan
              </div>
              {totalRevenue > 0 && (
                <div style={{ padding: '10px 18px', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 700, color: '#10b981', fontSize: 14 }}>
                  Rp {totalRevenue.toLocaleString('id-ID')}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Pie */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card-header">
            <Package size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Status Orderan</span>
          </div>
          <div className="card-body">
            {statusCounts.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}><p>Tidak ada data</p></div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                      {statusCounts.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltipPie />} />
                    <Legend formatter={(val) => <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{val}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>

        {/* Bar */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="card-header">
            <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Orderan per Hari</span>
          </div>
          <div className="card-body">
            {barData.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}><p>Tidak ada data</p></div>
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13 }}
                      labelStyle={{ fontWeight: 700 }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} name="Orderan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Production Reports Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Machine Usage */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
        >
          <div className="card-header">
            <Printer size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Penggunaan Mesin Dalam</span>
          </div>
          <div className="card-body">
            {topMachines.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}><p>Belum ada data cetak dalam</p></div>
            ) : topMachines.map(([name, count], i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                style={{ marginBottom: 14 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{count} item</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    style={{ background: '#10b981' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / (topMachines[0][1])) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Vendor Costs -> Usage */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
        >
          <div className="card-header">
            <Store size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Penggunaan Cetak Luar</span>
          </div>
          <div className="card-body">
            {topVendors.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}><p>Belum ada data cetak luar</p></div>
            ) : topVendors.map(([name, count], i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                style={{ marginBottom: 14 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                    {count} item
                  </span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    style={{ background: '#f59e0b' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / (topVendors[0][1])) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Two cols: table + top customers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Order Table */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="card-header">
            <BarChart2 size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Detail Orderan</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {filtered.length === 0 ? (
              <div className="empty-state"><p>Tidak ada data dalam rentang ini</p></div>
            ) : (
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Item</th>
                    <th>Status</th>
                    <th>File</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o, i) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                      <td>{o.order_items?.length || 0} item</td>
                      <td><span className={`badge badge-${o.status}`}>{STATUS_LABELS[o.status]}</span></td>
                      <td>{o.order_files?.length || 0} file</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(o.created_at)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Top Customers */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="card-header">
            <Package size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Top Customer</span>
          </div>
          <div className="card-body">
            {topCustomers.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}><p>Tidak ada data</p></div>
            ) : topCustomers.map(([name, count], i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.07 }}
                style={{ marginBottom: 14 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} {name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{count}x</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / (topCustomers[0][1])) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
