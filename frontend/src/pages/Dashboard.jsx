import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, TrendingUp, Package, Clock, CheckCircle2, PlusCircle, ArrowRight, Zap, FolderOpen, Bell, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getOrders, getOrderStats, supabase, getStatusConfig } from '../lib/supabase'
import StatCard from '../components/StatCard'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: 'var(--shadow-md)',
        fontSize: 13,
        color: 'var(--text-primary)',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ color: 'var(--accent)' }}>{payload[0].value} orderan</div>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const [statRes, ordersRes] = await Promise.all([
          getOrderStats('designer'),
          getOrders({ role: 'designer' })
        ])
        setStats(statRes.stats)
        setChartData(statRes.chartData.map(d => ({
          date: new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
          orderan: d.count
        })))
        setRecentOrders(ordersRes.slice(0, 5))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel('public:orders:dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'order_role=eq.designer' }, () => {
        load()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 11) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
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
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{getGreeting()}, Rekan Kreatif! 🎨</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, color: 'var(--text-secondary)' }}>
            <Calendar size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ fontSize: 13 }}>
              {stats?.pending > 0 
                ? `🔥 Semangat! Ada ${stats.pending} orderan menunggu sentuhanmu.` 
                : '✨ Saat ini antrean kosong. Waktunya ngopi atau eksplor referensi baru!'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            className="btn btn-secondary"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/orders')}
          >
            <FolderOpen size={16} /> Semua Data
          </motion.button>
          <motion.button
            className="btn btn-primary"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/orders/new')}
            style={{ background: 'linear-gradient(135deg, var(--blue-500), var(--blue-600))', border: 'none', boxShadow: 'var(--shadow-blue)' }}
          >
            <PlusCircle size={16} />
            Order Baru
          </motion.button>
        </div>
      </motion.div>

      {/* Quick Actions (Baru) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <motion.div
          className="card"
          whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
          onClick={() => navigate('/orders/new')}
          style={{ cursor: 'pointer', padding: 20, background: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(99,102,241,0.1))', border: '1px solid rgba(99,102,241,0.15)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--blue-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--blue-700)' }}>Buat Orderan Cepat</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Input pesanan pelanggan baru</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card"
          whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
          onClick={() => navigate('/reports')}
          style={{ cursor: 'pointer', padding: 20, background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(52,211,153,0.1))', border: '1px solid rgba(16,185,129,0.15)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#047857' }}>Rekap Pendapatan</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lihat statistik bulan ini</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card"
          whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
          onClick={() => navigate('/orders?status=revision')}
          style={{ cursor: 'pointer', padding: 20, background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(251,191,36,0.1))', border: '1px solid rgba(245,158,11,0.15)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--warning)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}>
              <Bell size={20} className={stats?.revision > 0 ? "animate-pulse-badge" : ""} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#b45309' }}>Cek Revisi</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats?.revision > 0 ? `Ada ${stats.revision} orderan minta revisi` : 'Tidak ada revisi aktif'}</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <StatCard label="Total Orderan"    value={stats?.total || 0}       icon={Package}      color="blue"   delay={0.05} />
        <StatCard label="Pending"          value={stats?.pending || 0}     icon={Clock}        color="yellow" delay={0.1} />
        <StatCard label="Sedang Dikerjakan" value={stats?.in_progress || 0} icon={TrendingUp}   color="purple" delay={0.15} />
        <StatCard label="Selesai"          value={stats?.done || 0}        icon={CheckCircle2} color="green"  delay={0.2} />
      </div>

      {/* Chart + Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Area Chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
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
                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="orderan"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#colorBlue)"
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#2563eb' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div className="flex items-center gap-2">
              <Package size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Orderan Terbaru</span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/orders')}
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Lihat semua <ArrowRight size={13} />
            </button>
          </div>
          <div style={{ padding: '8px 0' }}>
            <AnimatePresence>
              {recentOrders.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <LayoutDashboard size={28} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Belum Ada Pergerakan</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Santai dulu, atau mulai hari ini dengan<br/>menambahkan orderan baru ke sistem.</p>
                </div>
              ) : recentOrders.map((order, i) => {
                const cfg = getStatusConfig(order.status)
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 20px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      borderBottom: '1px solid var(--border)',
                    }}
                    whileHover={{ backgroundColor: 'var(--accent-light)' }}
                  >
                    <div style={{
                      width: 36, height: 36,
                      background: 'var(--accent-light)',
                      borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Package size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }} className="truncate">
                        {order.customer_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span>{order.order_items?.length || 0} item</span>
                          <span>·</span>
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                        {(order.order_items?.length || 0) > 0 && (
                          <div style={{ display: 'flex', gap: 6, fontSize: 11, fontWeight: 600, marginTop: 3 }}>
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
                      </div>
                    </div>
                    <span className={`badge badge-${order.status}`} style={{ fontSize: 11 }}>
                      {cfg.label}
                    </span>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
