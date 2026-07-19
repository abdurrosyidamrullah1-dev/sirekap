import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Package, User, Calendar, FileText, ChevronRight, Save, ArrowLeft, Printer, Store, DollarSign } from 'lucide-react'
import { createOrder, ORDER_STATUSES, getStatusConfig } from '../lib/supabase'
import toast from 'react-hot-toast'

const EMPTY_ITEM = { item_name: '', quantity: 1, notes: '', status: 'pending' }

export default function OrderForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: info, 2: items, 3: confirm
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    customer_name: '',
    status: 'pending',
    deadline: '',
    notes: '',
  })

  const [items, setItems] = useState([{ ...EMPTY_ITEM }])

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const addItem = () => {
    setItems(prev => [...prev, { ...EMPTY_ITEM }])
  }

  const updateItem = (i, key, val) => {
    setItems(prev => prev.map((item, idx) =>
      idx === i ? { ...item, [key]: val } : item
    ))
  }

  const removeItem = (i) => {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async () => {
    if (!form.customer_name.trim()) {
      toast.error('Nama customer wajib diisi!')
      return
    }
    const validItems = items.filter(it => it.item_name.trim())
    if (validItems.length === 0) {
      toast.error('Minimal 1 item harus diisi!')
      return
    }

    setLoading(true)
    try {
      const orderData = { ...form, order_role: 'designer' }
      const itemsToInsert = validItems.map(it => ({
        item_name: it.item_name,
        quantity: it.quantity,
        notes: it.notes,
        status: it.status || 'pending',
      }))
      const order = await createOrder(orderData, itemsToInsert)
      toast.success('Orderan berhasil ditambahkan! 🎉')
      navigate(`/orders/${order.id}`)
    } catch (e) {
      toast.error('Gagal menyimpan: ' + (e.message || 'Error tidak diketahui'))
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { num: 1, label: 'Info Customer' },
    { num: 2, label: 'Daftar Item' },
    { num: 3, label: 'Konfirmasi' },
  ]

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Tambah Orderan Baru ✨</h1>
          <p>Isi info customer dan daftar item pesanan</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/orders')}>
          <ArrowLeft size={15} /> Kembali
        </button>
      </div>

      {/* Stepper */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}
      >
        {steps.map((s, i) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <motion.div
              onClick={() => step > s.num && setStep(s.num)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: step > s.num ? 'pointer' : 'default'
              }}
              whileHover={step > s.num ? { scale: 1.04 } : {}}
            >
              <motion.div
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14,
                  background: step >= s.num ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: step >= s.num ? 'white' : 'var(--text-muted)',
                  border: step === s.num ? '3px solid var(--blue-300)' : '3px solid transparent',
                  flexShrink: 0,
                  transition: 'all 0.3s',
                }}
                animate={step === s.num ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                {step > s.num ? '✓' : s.num}
              </motion.div>
              <span style={{ fontSize: 13, fontWeight: step === s.num ? 700 : 500, color: step >= s.num ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {s.label}
              </span>
            </motion.div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step > s.num ? 'var(--accent)' : 'var(--border)', margin: '0 12px', transition: 'background 0.4s', borderRadius: 99 }} />
            )}
          </div>
        ))}
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            className="card"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="card-header">
              <User size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Informasi Customer</span>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nama Customer *</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Bapak Roni, PT. Maju..."
                    value={form.customer_name}
                    onChange={e => updateForm('customer_name', e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status Awal</label>
                  <select className="form-select" value={form.status} onChange={e => updateForm('status', e.target.value)}>
                    {ORDER_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.deadline}
                  onChange={e => updateForm('deadline', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Catatan</label>
                <textarea
                  className="form-textarea"
                  placeholder="Info tambahan, spesifikasi, dll..."
                  value={form.notes}
                  onChange={e => updateForm('notes', e.target.value)}
                />
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <motion.button
                className="btn btn-primary"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (!form.customer_name.trim()) { toast.error('Nama customer wajib diisi!'); return }
                  setStep(2)
                }}
              >
                Lanjut <ChevronRight size={15} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            className="card"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="card-header">
              <Package size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Daftar Item Pesanan</span>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
                {items.length} item
              </span>
            </div>
            <div className="card-body">
              {/* Column header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 1fr 36px', gap: 10, padding: '0 4px', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Nama Item</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Qty</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Catatan</span>
                <span></span>
              </div>

              <AnimatePresence>
                {items.map((item, i) => (
                  <motion.div
                    key={i}
                    className="item-row"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    style={{ display: 'block', background: 'var(--bg-tertiary)', padding: 12, borderRadius: 12, marginBottom: 12, border: '1px solid var(--border)' }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 1fr 36px', gap: 10, marginBottom: 12 }}>
                      <input
                        className="form-input"
                        placeholder={`Item ${i+1} (cth: tumbler, kaos...)`}
                        value={item.item_name}
                        onChange={e => updateItem(i, 'item_name', e.target.value)}
                      />
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      <input
                        className="form-input"
                        placeholder="Catatan..."
                        value={item.notes}
                        onChange={e => updateItem(i, 'notes', e.target.value)}
                      />
                      <motion.button
                        className="btn btn-ghost btn-icon"
                        onClick={() => removeItem(i)}
                        disabled={items.length === 1}
                        whileHover={{ scale: 1.1, color: 'var(--danger)' }}
                        whileTap={{ scale: 0.9 }}
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                    
                    {/* Production Info */}
                    <div style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className={`btn ${item.production_type === 'in_house' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '6px 10px', fontSize: 13 }}
                          onClick={() => { updateItem(i, 'production_type', 'in_house'); updateItem(i, 'production_location', 'Mesin A3'); }}
                        >
                          <Printer size={14} /> Cetak Sini
                        </button>
                        <button
                          className={`btn ${item.production_type === 'outsourced' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '6px 10px', fontSize: 13 }}
                          onClick={() => { updateItem(i, 'production_type', 'outsourced'); updateItem(i, 'production_location', ''); }}
                        >
                          <Store size={14} /> Cetak Luar
                        </button>
                      </div>
                      
                      <div style={{ flex: 1, display: 'flex', gap: 8, minWidth: 200 }}>
                        {item.production_type === 'in_house' ? (
                          <select 
                            className="form-select" 
                            style={{ flex: 1, margin: 0, padding: '6px 12px', fontSize: 13 }}
                            value={item.production_location}
                            onChange={e => updateItem(i, 'production_location', e.target.value)}
                          >
                            <option value="Mesin A3">Mesin A3</option>
                            <option value="Mesin Grafir">Mesin Grafir</option>
                            <option value="Mesin UV">Mesin UV</option>
                            <option value="Mesin Banner">Mesin Banner</option>
                            <option value="Mesin DTF">Mesin DTF</option>
                          </select>
                        ) : (
                            <input
                              className="form-input"
                              placeholder="Nama Vendor / Tempat"
                              style={{ flex: 1, margin: 0, padding: '6px 12px', fontSize: 13 }}
                              value={item.production_location}
                              onChange={e => updateItem(i, 'production_location', e.target.value)}
                            />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                className="btn btn-secondary mt-3"
                onClick={addItem}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Plus size={16} /> Tambah Item
              </motion.button>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={15} /> Kembali
              </button>
              <motion.button
                className="btn btn-primary"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setStep(3)}
              >
                Lanjut <ChevronRight size={15} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Confirm Card */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <User size={18} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 700 }}>Konfirmasi Orderan</span>
              </div>
              <div className="card-body">
                <div className="detail-grid" style={{ marginBottom: 20 }}>
                  <div className="detail-item">
                    <span className="detail-label">Customer</span>
                    <span className="detail-value">{form.customer_name || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`badge badge-${form.status}`} style={{
                      background: getStatusConfig(form.status).color + '20',
                      color: getStatusConfig(form.status).color
                    }}>
                      {getStatusConfig(form.status).label}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Deadline</span>
                    <span className="detail-value">{form.deadline || 'Tidak ditentukan'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Item</span>
                    <span className="detail-value">{items.filter(it=>it.item_name).length} item</span>
                  </div>
                </div>

                {form.notes && (
                  <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 10, marginBottom: 16 }}>
                    <div className="detail-label" style={{ marginBottom: 4 }}>Catatan</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{form.notes}</div>
                  </div>
                )}

                <div>
                  <div className="detail-label" style={{ marginBottom: 10 }}>Daftar Item</div>
                  {items.filter(it => it.item_name).map((it, i) => (
                    <motion.div
                      key={i}
                      className="file-item"
                      style={{ alignItems: 'flex-start' }}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <div className="file-icon">
                        <Package size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="file-name">{it.item_name}</div>
                        {it.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{it.notes}</div>}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: it.production_type === 'in_house' ? 'var(--bg-tertiary)' : '#f59e0b20', color: it.production_type === 'in_house' ? 'var(--text-primary)' : '#f59e0b' }}>
                          {it.production_type === 'in_house' ? <Printer size={12} /> : <Store size={12} />}
                          {it.production_type === 'in_house' ? 'Cetak Dalam' : 'Cetak Luar'} • {it.production_location || 'Belum dipilih'}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>
                        x{it.quantity}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)}>
                  <ArrowLeft size={15} /> Kembali
                </button>
                <motion.button
                  className="btn btn-primary"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Menyimpan...</> : <><Save size={15} /> Simpan Orderan</>}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
