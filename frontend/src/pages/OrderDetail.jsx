import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Package, FolderOpen, CheckCircle2, Clock,
  AlertCircle, Plus, X, Save, Edit2, Trash2, Info,
  Workflow, Printer, Store,
} from 'lucide-react'
import {
  getOrderById, updateOrder, updateOrderItem, deleteOrderItem,
  addOrderItem, getStatusConfig, ORDER_STATUSES, deleteOrder
} from '../lib/supabase'
import FileManager from '../components/FileManager'
import WorkflowTracker from '../components/WorkflowTracker'
import { isGoogleSignedIn } from '../lib/drive'
import toast from 'react-hot-toast'

const ITEM_STATUS = [
  { value: 'pending',     label: 'Pending',  icon: Clock,         color: 'var(--warning)' },
  { value: 'in_progress', label: 'Proses',   icon: Package,       color: 'var(--blue-500)' },
  { value: 'done',        label: 'Done',     icon: CheckCircle2,  color: 'var(--success)' },
]

const TABS = [
  { key: 'info',     label: 'Info & Item',   icon: Info },
  { key: 'files',    label: 'File Manager',  icon: FolderOpen },
  { key: 'workflow', label: 'Workflow',      icon: Workflow },
]

const MESIN_OPTIONS = ['Mesin A3', 'Mesin Grafir', 'Mesin UV', 'Mesin Banner', 'Mesin DTF']

// ─── Inline Edit Form per Item ────────────────────────────────────────────────
function ItemEditForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    item_name: item.item_name || '',
    quantity: item.quantity || 1,
    notes: item.notes || '',
    production_type: item.production_type || 'in_house',
    production_location: item.production_location || 'Mesin A3',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.item_name.trim()) { toast.error('Nama item wajib diisi'); return }
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        background: 'var(--accent-light)', borderRadius: 12, padding: 14,
        border: '1.5px solid var(--blue-200)', marginBottom: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          ✏️ Edit Item
        </div>

        {/* Row 1: nama, qty, catatan */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 1fr', gap: 8, marginBottom: 10 }}>
          <input
            className="form-input"
            placeholder="Nama item..."
            value={form.item_name}
            onChange={e => setForm(p => ({ ...p, item_name: e.target.value }))}
            autoFocus
          />
          <input
            type="number" className="form-input" min="1"
            value={form.quantity}
            onChange={e => setForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
          />
          <input
            className="form-input"
            placeholder="Catatan..."
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          />
        </div>

        {/* Row 2: lokasi produksi */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`btn ${form.production_type === 'in_house' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: 12, minHeight: 32 }}
              onClick={() => setForm(p => ({ ...p, production_type: 'in_house', production_location: 'Mesin A3' }))}
            >
              <Printer size={13} /> Cetak Sini
            </button>
            <button
              className={`btn ${form.production_type === 'outsourced' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: 12, minHeight: 32 }}
              onClick={() => setForm(p => ({ ...p, production_type: 'outsourced', production_location: '' }))}
            >
              <Store size={13} /> Cetak Luar
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            {form.production_type === 'in_house' ? (
              <select
                className="form-select"
                style={{ margin: 0, padding: '4px 10px', fontSize: 12, minHeight: 32 }}
                value={form.production_location}
                onChange={e => setForm(p => ({ ...p, production_location: e.target.value }))}
              >
                {MESIN_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input
                className="form-input"
                placeholder="Nama Vendor / Tempat cetak"
                style={{ margin: 0, padding: '4px 10px', fontSize: 12, minHeight: 32 }}
                value={form.production_location}
                onChange={e => setForm(p => ({ ...p, production_location: e.target.value }))}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>
            <X size={13} /> Batal
          </button>
          <motion.button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
            whileTap={{ scale: 0.95 }}
          >
            {saving
              ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
              : <Save size={13} />
            } Simpan
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [addingItem, setAddingItem] = useState(false)
  const [newItem, setNewItem] = useState({ item_name: '', quantity: 1, notes: '', production_type: 'in_house', production_location: 'Mesin A3' })
  const [saving, setSaving] = useState(false)
  const [deletingOrder, setDeletingOrder] = useState(false)
  const [editingItemId, setEditingItemId] = useState(null) // track item yang sedang diedit

  const load = async () => {
    try {
      const data = await getOrderById(id)
      setOrder(data)
      setEditForm({
        customer_name: data.customer_name,
        status: data.status,
        deadline: data.deadline || '',
        notes: data.notes || '',
      })
    } catch {
      toast.error('Orderan tidak ditemukan')
      navigate('/orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Poll setiap 30 detik sebagai pengganti realtime (backend tidak expose Supabase realtime)
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [id])

  const handleSaveOrder = async () => {
    setSaving(true)
    try {
      await updateOrder(id, editForm)
      setOrder(prev => ({ ...prev, ...editForm }))
      setEditMode(false)
      toast.success('Orderan diperbarui!')
    } catch { toast.error('Gagal memperbarui') }
    finally { setSaving(false) }
  }

  const handleItemStatus = async (itemId, newStatus) => {
    try {
      await updateOrderItem(itemId, { status: newStatus })
      setOrder(prev => ({
        ...prev,
        order_items: prev.order_items.map(it => it.id === itemId ? { ...it, status: newStatus } : it)
      }))
    } catch { toast.error('Gagal update status item') }
  }

  const handleSaveItem = async (itemId, updates) => {
    try {
      const updated = await updateOrderItem(itemId, updates)
      setOrder(prev => ({
        ...prev,
        order_items: prev.order_items.map(it => it.id === itemId ? { ...it, ...updated } : it)
      }))
      setEditingItemId(null)
      toast.success('Item diperbarui!')
    } catch { toast.error('Gagal update item') }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Hapus item ini?')) return
    try {
      await deleteOrderItem(itemId)
      setOrder(prev => ({ ...prev, order_items: prev.order_items.filter(it => it.id !== itemId) }))
      toast.success('Item dihapus')
    } catch { toast.error('Gagal hapus item') }
  }

  const handleAddItem = async () => {
    if (!newItem.item_name.trim()) { toast.error('Nama item wajib diisi'); return }
    try {
      const added = await addOrderItem({ ...newItem, order_id: id })
      setOrder(prev => ({ ...prev, order_items: [...prev.order_items, added] }))
      setNewItem({ item_name: '', quantity: 1, notes: '', production_type: 'in_house', production_location: 'Mesin A3' })
      setAddingItem(false)
      toast.success('Item ditambahkan!')
    } catch { toast.error('Gagal tambah item') }
  }

  const handleFilesChanged = (action, file) => {
    setOrder(prev => ({
      ...prev,
      order_files: action === 'add'
        ? [...(prev.order_files || []), file]
        : (prev.order_files || []).filter(f => f.id !== file.id)
    }))
  }

  const handleDeleteOrder = async () => {
    if (!confirm(`Hapus orderan "${order.customer_name}"? Tindakan ini tidak bisa dibatalkan.`)) return
    setDeletingOrder(true)
    try {
      await deleteOrder(id)
      toast.success('Orderan berhasil dihapus!')
      navigate('/orders')
    } catch {
      toast.error('Gagal menghapus orderan')
      setDeletingOrder(false)
    }
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) return (
    <div className="page-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="skeleton" style={{ width: 140, height: 14 }} />
        <div className="skeleton" style={{ width: 300, height: 32 }} />
        <div className="skeleton" style={{ width: '100%', height: 180, borderRadius: 16 }} />
      </div>
    </div>
  )
  if (!order) return null

  const doneItems = order.order_items?.filter(it => it.status === 'done').length || 0
  const totalItems = order.order_items?.length || 0
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0
  const statusCfg = getStatusConfig(order.status)

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Back */}
      <motion.button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/orders')}
        style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}
        whileHover={{ x: -3 }}
      >
        <ArrowLeft size={15} /> Kembali
      </motion.button>

      {/* Order Header Card */}
      <motion.div
        className="card"
        style={{ marginBottom: 20 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            {/* Left: Name + info */}
            <div style={{ flex: 1 }}>
              {editMode ? (
                <input
                  className="form-input"
                  value={editForm.customer_name}
                  onChange={e => setEditForm(p => ({ ...p, customer_name: e.target.value }))}
                  style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}
                />
              ) : (
                <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, letterSpacing: -0.5 }}>
                  {order.customer_name}
                </h2>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                #{order.id.slice(0, 8).toUpperCase()} · Dibuat {formatDate(order.created_at)}
              </div>

              {editMode ? (
                <div className="form-row" style={{ maxWidth: 500 }}>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                      {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input type="date" className="form-input" value={editForm.deadline} onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`badge badge-${order.status}`}
                      style={{ background: statusCfg.color + '20', color: statusCfg.color }}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Deadline</span>
                    <span className="detail-value">{formatDate(order.deadline)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">File Desain</span>
                    <span className="detail-value">{order.order_files?.length || 0} file</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Item Selesai</span>
                    <span className="detail-value">{doneItems}/{totalItems}</span>
                  </div>
                </div>
              )}

              {editMode && (
                <div className="form-group" style={{ marginTop: 8, maxWidth: 500 }}>
                  <label className="form-label">Catatan</label>
                  <textarea className="form-textarea" rows={2} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              )}

              {order.notes && !editMode && (
                <div style={{ marginTop: 12, padding: '9px 13px', background: 'var(--bg-tertiary)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)', borderLeft: '3px solid var(--border)' }}>
                  📝 {order.notes}
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {editMode ? (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}><X size={14} /> Batal</button>
                  <motion.button className="btn btn-primary btn-sm" onClick={handleSaveOrder} disabled={saving} whileTap={{ scale: 0.95 }}>
                    {saving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Save size={14} />} Simpan
                  </motion.button>
                </>
              ) : (
                <>
                  {order.drive_folder_url && (
                    <a href={order.drive_folder_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                      <FolderOpen size={14} /> Drive
                    </a>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <motion.button
                    className="btn btn-sm"
                    style={{ background: '#ef4444', color: 'white', border: 'none' }}
                    onClick={handleDeleteOrder}
                    disabled={deletingOrder}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  >
                    <Trash2 size={14} /> Hapus
                  </motion.button>
                </>
              )}
            </div>
          </div>

          {/* Progress */}
          {totalItems > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Progres Item</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: statusCfg.color }}>{progress}%</span>
              </div>
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
                  style={{ background: `linear-gradient(90deg, ${statusCfg.color}99, ${statusCfg.color})` }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = tab === t.key
          return (
            <motion.button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 16px', borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                background: isActive ? 'var(--bg-card)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                borderBottom: isActive ? '1px solid var(--bg-card)' : 'transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: 14, cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: isActive ? -1 : 0,
              }}
              whileHover={{ color: 'var(--accent)' }}
            >
              <Icon size={15} />
              {t.label}
              {t.key === 'files' && (order.order_files?.length || 0) > 0 && (
                <span style={{
                  background: 'var(--accent)', color: 'white',
                  borderRadius: 99, fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', minWidth: 18, textAlign: 'center'
                }}>{order.order_files.length}</span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">

        {/* ── INFO TAB ── */}
        {tab === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div className="flex items-center gap-2">
                  <Package size={18} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Daftar Item</span>
                  <span style={{
                    fontSize: 11, background: 'var(--accent-light)', color: 'var(--accent)',
                    fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  }}>{totalItems}</span>
                </div>
                <motion.button className="btn btn-secondary btn-sm" onClick={() => setAddingItem(true)} whileHover={{ scale: 1.04 }}>
                  <Plus size={14} /> Tambah Item
                </motion.button>
              </div>

              <div className="card-body" style={{ padding: '12px 20px' }}>
                {/* Add item form */}
                <AnimatePresence>
                  {addingItem && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}
                    >
                      <div style={{
                        background: 'var(--accent-light)', borderRadius: 12, padding: 14,
                        border: '1.5px solid var(--blue-200)',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          ➕ Tambah Item Baru
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 1fr', gap: 8, marginBottom: 10 }}>
                          <input className="form-input" placeholder="Nama item..." value={newItem.item_name}
                            onChange={e => setNewItem(p => ({ ...p, item_name: e.target.value }))} autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleAddItem()} />
                          <input type="number" className="form-input" min="1" value={newItem.quantity}
                            onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                          <input className="form-input" placeholder="Catatan..." value={newItem.notes}
                            onChange={e => setNewItem(p => ({ ...p, notes: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleAddItem()} />
                        </div>

                        {/* Production Info */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className={`btn ${newItem.production_type === 'in_house' ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '4px 10px', fontSize: 12, minHeight: 32 }}
                              onClick={() => setNewItem(p => ({ ...p, production_type: 'in_house', production_location: 'Mesin A3' }))}
                            >
                              <Printer size={13} /> Cetak Sini
                            </button>
                            <button
                              className={`btn ${newItem.production_type === 'outsourced' ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '4px 10px', fontSize: 12, minHeight: 32 }}
                              onClick={() => setNewItem(p => ({ ...p, production_type: 'outsourced', production_location: '' }))}
                            >
                              <Store size={13} /> Cetak Luar
                            </button>
                          </div>

                          <div style={{ flex: 1, display: 'flex', gap: 8, minWidth: 200 }}>
                            {newItem.production_type === 'in_house' ? (
                              <select
                                className="form-select"
                                style={{ flex: 1, margin: 0, padding: '4px 10px', fontSize: 12, minHeight: 32 }}
                                value={newItem.production_location}
                                onChange={e => setNewItem(p => ({ ...p, production_location: e.target.value }))}
                              >
                                {MESIN_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            ) : (
                              <input
                                className="form-input"
                                placeholder="Nama Vendor / Tempat"
                                style={{ flex: 1, margin: 0, padding: '4px 10px', fontSize: 12, minHeight: 32 }}
                                value={newItem.production_location}
                                onChange={e => setNewItem(p => ({ ...p, production_location: e.target.value }))}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setAddingItem(false)}><X size={13} /> Batal</button>
                        <button className="btn btn-primary btn-sm" onClick={handleAddItem}><Plus size={13} /> Tambah</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Items List */}
                {order.order_items?.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <p>Belum ada item. Klik "Tambah Item" untuk menambahkan.</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {order.order_items?.map((item, i) => {
                      const sc = ITEM_STATUS.find(s => s.value === item.status) || ITEM_STATUS[0]
                      const StatusIcon = sc.icon
                      const isEditing = editingItemId === item.id

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 16, height: 0 }}
                          transition={{ delay: i * 0.04 }}
                          style={{ marginBottom: 10 }}
                        >
                          {/* Edit form (inline) */}
                          <AnimatePresence>
                            {isEditing && (
                              <ItemEditForm
                                item={item}
                                onSave={(updates) => handleSaveItem(item.id, updates)}
                                onCancel={() => setEditingItemId(null)}
                              />
                            )}
                          </AnimatePresence>

                          {/* Item row (selalu tampil, edit form di atasnya) */}
                          {!isEditing && (
                            <div
                              className="file-item"
                              style={{ alignItems: 'flex-start', borderRadius: 12, padding: '12px 14px' }}
                            >
                              {/* Status icon */}
                              <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: item.status === 'done' ? 'rgba(16,185,129,.12)' :
                                            item.status === 'in_progress' ? 'rgba(59,130,246,.12)' : 'var(--bg-tertiary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <StatusIcon size={16} style={{ color: sc.color }} />
                              </div>

                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Nama + qty */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                                    {item.item_name}
                                  </span>
                                  <span style={{
                                    fontSize: 11, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                                    padding: '1px 7px', borderRadius: 99, fontWeight: 700,
                                  }}>×{item.quantity}</span>
                                </div>

                                {/* Catatan */}
                                {item.notes && (
                                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                                    📝 {item.notes}
                                  </div>
                                )}

                                {/* Lokasi produksi */}
                                {item.production_type ? (
                                  <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, marginBottom: 8,
                                    background: item.production_type === 'in_house' ? 'rgba(59,130,246,0.08)' : 'rgba(245,158,11,0.1)',
                                    color: item.production_type === 'in_house' ? '#3b82f6' : '#f59e0b',
                                    border: `1px solid ${item.production_type === 'in_house' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.25)'}`,
                                  }}>
                                    {item.production_type === 'in_house' ? <Printer size={11} /> : <Store size={11} />}
                                    {item.production_type === 'in_house' ? 'Cetak Sini' : 'Cetak Luar'}
                                    {item.production_location && (
                                      <>
                                        <span style={{ opacity: 0.5 }}>•</span>
                                        <span>{item.production_location}</span>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, marginBottom: 8,
                                    background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                                  }}>
                                    <AlertCircle size={11} /> Lokasi belum diisi
                                  </div>
                                )}

                                {/* Status toggle buttons */}
                                <div style={{ display: 'flex', gap: 5 }}>
                                  {ITEM_STATUS.map(s => {
                                    const SIcon = s.icon
                                    return (
                                      <motion.button
                                        key={s.value}
                                        onClick={() => handleItemStatus(item.id, s.value)}
                                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: 4,
                                          padding: '4px 10px', borderRadius: 99,
                                          fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                                          background: item.status === s.value ? s.color : 'var(--bg-tertiary)',
                                          color: item.status === s.value ? 'white' : 'var(--text-muted)',
                                          transition: 'all 0.2s',
                                        }}
                                      >
                                        <SIcon size={10} /> {s.label}
                                      </motion.button>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* Action buttons: Edit + Delete */}
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                <motion.button
                                  className="btn btn-ghost btn-icon"
                                  onClick={() => setEditingItemId(item.id)}
                                  whileHover={{ scale: 1.1, color: 'var(--accent)' }}
                                  style={{ color: 'var(--text-muted)', padding: 6 }}
                                  title="Edit item"
                                >
                                  <Edit2 size={14} />
                                </motion.button>
                                <motion.button
                                  className="btn btn-ghost btn-icon"
                                  onClick={() => handleDeleteItem(item.id)}
                                  whileHover={{ scale: 1.1, color: 'var(--danger)' }}
                                  style={{ color: 'var(--text-muted)', padding: 6 }}
                                  title="Hapus item"
                                >
                                  <Trash2 size={14} />
                                </motion.button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── FILES TAB ── */}
        {tab === 'files' && (
          <motion.div
            key="files"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="card">
              <div className="card-header">
                <FolderOpen size={18} style={{ color: 'var(--accent)' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>File Manager</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    File disimpan di Google Drive · Folder: {order.customer_name}
                  </div>
                </div>
              </div>
              <div className="card-body">
                <FileManager order={order} onFilesChanged={handleFilesChanged} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── WORKFLOW TAB ── */}
        {tab === 'workflow' && (
          <motion.div
            key="workflow"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="card">
              <div className="card-header">
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: statusCfg.color + '20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusCfg.color }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Workflow Orderan</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Kelola status, approve, revisi, dan riwayat perubahan
                  </div>
                </div>
              </div>
              <div className="card-body">
                <WorkflowTracker order={order} onStatusChanged={(newStatus) => {
                  setOrder(prev => ({
                    ...prev,
                    status: newStatus,
                    order_timeline: [
                      ...(prev.order_timeline || []),
                      { id: Date.now(), status: newStatus, note: '', created_at: new Date().toISOString() }
                    ]
                  }))
                }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
