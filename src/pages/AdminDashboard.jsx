import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, Package, Clock, CheckCircle2,
  PlusCircle, ArrowRight, DollarSign, Users, Activity
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getOrders, getOrderStats, supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts'

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#ef4444']
const STATUS_LABELS = {
  pending:     'Pending',
  in_progress: 'Dikerjakan',
  review:      'Review',
  revision:    'Revisi',
  approved:    'Approved',
  done:        'Selesai',
  cancelled:   'Dibatalkan',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)',
        fontSize: 13, color: 'var(--text-primary)',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ color: 'var(--accent)' }}>{payload[0].value} orderan</div>
      </div>
    )
  }
  return null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const [statRes, ordersRes] = await Promise.all([
          getOrderStats('admin'),
          getOrders({ role: 'admin' })
        ])
        setStats(statRes.stats)
        setChartData(statRes.chartData.map(d => ({
          date: new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
          orderan: d.count,
        })))
        setAllOrders(ordersRes)
        setRecentOrders(ordersRes.slice(0, 6))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel('public:orders:admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'order_role=eq.admin' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const statusCounts = Object.entries(STATUS_LABELS)
    .map(([val, name]) => ({
      name,
      value: allOrders.filter(o => o.status === val).length,
    }))
    .filter(d => d.value > 0)

  // Total items across all orders
  const totalItems = allOrders.reduce((sum, o) => sum + (o.order_items?.length || 0), 0)

  // Revenue estimate: count done orders with price
  const totalRevenue = allOrders
    .flatMap(o => o.order_items || [])
    .reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 1)), 0)

  const formatDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const formatRupiah = (n) => n > 0 ? `Rp ${n.toLocaleString('id-ID')}` : '-'

  const statusConfig = {
    pending:     { label: 'Pending',    color: 'var(--warning)' },
    in_progress: { label: 'Dikerjakan', color: 'var(--blue-500)' },
    review:      { label: 'Review',     color: '#8b5cf6' },
    revision:    { label: 'Revisi',     color: '#f97316' },
    approved:    { label: 'Approved',   color: '#10b981' },
    done:        { label: 'Selesai',    color: 'var(--success)' },
    cancelled:   { label: 'Batal',      color: 'var(--danger)' },
  }

  if (loading) return (
    <div className="page-container">
      <div className="stat-grid">
        {[0,1,2,3].map(i => (
          <div key={i} className="stat-card" style={{ height: 120 }}>
            <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 10, marginBottom: 14 }} />
            <div className="skeleton" style={{ width: 60, height: 30, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 100, height: 14 }} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Page Header */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="page-header-left">
          <h1>Admin Dashboard 🛡️</h1>
          <p>Ringkasan keseluruhan bisnis Bhinneka Production.</p>
        </div>
        <motion.button
          className="btn btn-primary"
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/orders/new')}
        >
          <PlusCircle size={16} /> Tambah Orderan
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <StatCard label="Total Orderan"    value={stats?.total || 0}       icon={Package}      color="blue"   delay={0.05} />
        <StatCard label="Pending"          value={stats?.pending || 0}     icon={Clock}        color="yellow" delay={0.1} />
        <StatCard label="Sedang Dikerjakan" value={stats?.in_progress || 0} icon={Activity}     color="purple" delay={0.15} />
        <StatCard label="Selesai"          value={stats?.done || 0}        icon={CheckCircle2} color="green"  delay={0.2} />
      </div>

      {/* Revenue + extra stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Item Produksi', value: totalItems, icon: Package, color: '#6366f1' },
          { label: 'Total Omset', value: formatRupiah(totalRevenue), icon: DollarSign, color: '#10b981' },
          { label: 'Total Customer', value: [...new Set(allOrders.map(o => o.customer_name))].length, icon: Users, color: '#f59e0b' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              className="card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 + i * 0.05 }}
              style={{ padding: '18px 20px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Chart + Status Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>
        {/* Area Chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header">
            <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Orderan 7 Hari Terakhir</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tren harian</div>
            </div>
          </div>
          <div className="card-body">
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="orderan" stroke="#10b981" strokeWidth={2.5}
                    fill="url(#colorAdmin)" dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#059669' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Pie Status */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="card-header">
            <Package size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Status Orderan</span>
          </div>
          <div className="card-body">
            {statusCounts.length === 0 ? (
              <div className="empty-state"><p>Belum ada data</p></div>
            ) : (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={48} outerRadius={74} paddingAngle={4} dataKey="value">
                      {statusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                    <Legend formatter={(val) => <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{val}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Orders Table */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Orderan Terbaru</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            Lihat semua <ArrowRight size={13} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {recentOrders.length === 0 ? (
            <div className="empty-state"><p>Belum ada orderan</p></div>
          ) : (
            <table className="order-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Total Harga</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, i) => {
                  const cfg = statusConfig[order.status] || statusConfig.pending
                  const total = (order.order_items || []).reduce((s, it) => s + ((it.unit_price || 0) * (it.quantity || 1)), 0)
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600 }}>{order.customer_name}</td>
                      <td>{order.order_items?.length || 0} item</td>
                      <td><span className={`badge badge-${order.status}`}>{cfg.label}</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>{formatRupiah(total)}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(order.created_at)}</td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
