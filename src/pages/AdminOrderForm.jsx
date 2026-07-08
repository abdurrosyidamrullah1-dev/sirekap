import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, User, Receipt, Save, ArrowLeft,
  ChevronRight, Phone, FileText, DollarSign, CheckCircle2
} from 'lucide-react'
import { createOrder } from '../lib/supabase'
import { getAccessToken, isGoogleSignedIn } from '../lib/drive'
import InvoiceTemplate from '../components/InvoiceTemplate'
import toast from 'react-hot-toast'

const EMPTY_ITEM = { item_name: '', quantity: 1, unit_price: 0 }

// ─── Fungsi upload PDF invoice ke Google Drive (folder per bulan) ──────────────
async function uploadInvoiceToDrive(pdfBlob, customerName, invoiceDate) {
  const token = getAccessToken()
  if (!token) return null

  // Format nama folder: "Juli 2025"
  const monthFolder = new Date(invoiceDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const rootName = 'Invoice Bhinneka Production'

  // 1. Cari/buat root folder "Invoice Bhinneka Production"
  let rootId
  const rootSearch = await driveSearch(`name='${rootName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`, token)
  if (rootSearch.length > 0) {
    rootId = rootSearch[0].id
  } else {
    rootId = await createDriveFolder(rootName, null, token)
  }

  // 2. Cari/buat folder bulan: misal "Juli 2025"
  let monthId
  const monthSearch = await driveSearch(`'${rootId}' in parents and name='${monthFolder}' and mimeType='application/vnd.google-apps.folder' and trashed=false`, token)
  if (monthSearch.length > 0) {
    monthId = monthSearch[0].id
  } else {
    monthId = await createDriveFolder(monthFolder, rootId, token)
  }

  // 3. Upload PDF ke folder bulan
  const fileName = `Invoice_${customerName}_${new Date(invoiceDate).toLocaleDateString('id-ID').replace(/\//g, '-')}.pdf`
  const metadata = { name: fileName, parents: [monthId] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', pdfBlob, fileName)

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) return null
  return await res.json()
}

async function driveSearch(q, token) {
  const url = new URL('https://www.googleapis.com/drive/v3/files')
  url.searchParams.set('q', q)
  url.searchParams.set('fields', 'files(id,name)')
  url.searchParams.set('spaces', 'drive')
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  const data = await res.json()
  return data.files || []
}

async function createDriveFolder(name, parentId, token) {
  const body = { name, mimeType: 'application/vnd.google-apps.folder' }
  if (parentId) body.parents = [parentId]
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return data.id
}

export default function AdminOrderForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const invoiceRef = useRef(null)

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    notes: '',
    status: 'pending',
    deadline: '',
  })

  const [items, setItems] = useState([{ ...EMPTY_ITEM }])

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])

  const updateItem = (i, key, val) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item))

  const removeItem = (i) => {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  const validItems = items.filter(it => it.item_name.trim())
  const totalHarga = validItems.reduce((s, it) => s + ((it.unit_price || 0) * (it.quantity || 1)), 0)

  const handleSubmit = async () => {
    if (!form.customer_name.trim()) { toast.error('Nama customer wajib diisi!'); return }
    if (validItems.length === 0) { toast.error('Minimal 1 item harus diisi!'); return }

    setLoading(true)
    try {
      const orderData = { ...form, status: 'pending', order_role: 'admin' }
      const order = await createOrder(orderData, validItems.map(it => ({
        item_name: it.item_name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        status: 'pending',
        production_type: 'in_house',
        production_location: '-',
      })))
      toast.success('Invoice berhasil dibuat! 🎉')

      // Auto-upload invoice ke Google Drive kalau sudah login
      if (isGoogleSignedIn()) {
        uploadInvoiceToBackground(order)
      }

      navigate(`/orders/${order.id}?tab=invoice`)
    } catch (e) {
      toast.error('Gagal menyimpan invoice')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const uploadInvoiceToBackground = async (order) => {
    try {
      const { default: html2canvas } = await import('html2canvas-pro')
      const { jsPDF } = await import('jspdf')

      // Render hidden invoice
      const hiddenDiv = document.getElementById('hidden-invoice-render')
      if (!hiddenDiv) return

      const canvas = await html2canvas(hiddenDiv, { scale: 2, useCORS: true, backgroundColor: '#fff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const imgProps = pdf.getImageProperties(imgData)
      const imgH = (imgProps.height * pw) / imgProps.width
      pdf.addImage(imgData, 'PNG', 0, 0, pw, Math.min(imgH, ph))
      const pdfBlob = pdf.output('blob')

      const result = await uploadInvoiceToDrive(pdfBlob, order.customer_name, order.created_at || new Date())
      if (result) {
        toast.success('Invoice tersimpan ke Google Drive!', { icon: '📁' })
      }
    } catch (e) {
      console.warn('Auto-upload invoice gagal:', e)
    }
  }

  // Order preview untuk InvoiceTemplate
  const previewOrder = {
    ...form,
    created_at: new Date().toISOString(),
    order_items: validItems,
  }

  const steps = [
    { num: 1, label: 'Info Customer' },
    { num: 2, label: 'Daftar Pesanan' },
    { num: 3, label: 'Preview Invoice' },
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
          <h1>Buat Invoice Baru 🧾</h1>
          <p>Isi data customer dan pesanan, lalu preview invoice</p>
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
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: step > s.num ? 'pointer' : 'default' }}
              whileHover={step > s.num ? { scale: 1.04 } : {}}
            >
              <motion.div
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                  background: step >= s.num ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: step >= s.num ? 'white' : 'var(--text-muted)',
                  border: step === s.num ? '3px solid var(--blue-300)' : '3px solid transparent',
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

      {/* Steps */}
      <AnimatePresence mode="wait">

        {/* ── STEP 1: Info Customer ── */}
        {step === 1 && (
          <motion.div
            key="step1"
            className="card"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="card-header">
              <User size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Data Customer</span>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nama Customer *</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Bapak Jodi, PT. Maju Jaya..."
                    value={form.customer_name}
                    onChange={e => updateForm('customer_name', e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">No. HP / WhatsApp</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: 08123456789"
                    value={form.customer_phone}
                    onChange={e => updateForm('customer_phone', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Alamat (opsional)</label>
                <input
                  className="form-input"
                  placeholder="Alamat pengiriman atau jemput..."
                  value={form.customer_address}
                  onChange={e => updateForm('customer_address', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Catatan Tambahan</label>
                <textarea
                  className="form-textarea"
                  placeholder="Info tambahan untuk customer..."
                  value={form.notes}
                  onChange={e => updateForm('notes', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <motion.button
                className="btn btn-primary"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
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

        {/* ── STEP 2: Daftar Pesanan ── */}
        {step === 2 && (
          <motion.div
            key="step2"
            className="card"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="card-header">
              <Receipt size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Daftar Pesanan</span>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>{items.length} item</span>
            </div>
            <div className="card-body">
              {/* Column header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 130px 36px', gap: 10, padding: '0 4px', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Nama Produk</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Qty</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Harga Satuan</span>
                <span></span>
              </div>

              <AnimatePresence>
                {items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    style={{ marginBottom: 10 }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 130px 36px', gap: 10, background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <input
                        className="form-input"
                        placeholder={`Produk ${i + 1} (cth: Kaos, Tumbler...)`}
                        value={item.item_name}
                        onChange={e => updateItem(i, 'item_name', e.target.value)}
                        style={{ margin: 0 }}
                      />
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                        style={{ margin: 0 }}
                      />
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, pointerEvents: 'none' }}>Rp</span>
                        <input
                          type="number"
                          className="form-input"
                          min="0"
                          placeholder="0"
                          value={item.unit_price || ''}
                          onChange={e => updateItem(i, 'unit_price', parseInt(e.target.value) || 0)}
                          style={{ margin: 0, paddingLeft: 34 }}
                        />
                      </div>
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
                    {/* Subtotal per baris */}
                    {(item.unit_price > 0) && (
                      <div style={{ textAlign: 'right', paddingRight: 48, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        Subtotal: <strong style={{ color: 'var(--accent)' }}>Rp {((item.unit_price || 0) * (item.quantity || 1)).toLocaleString('id-ID')}</strong>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                className="btn btn-secondary"
                onClick={addItem}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              >
                <Plus size={16} /> Tambah Produk
              </motion.button>

              {/* Total */}
              {totalHarga > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: 16, padding: '14px 18px',
                    background: 'linear-gradient(135deg, var(--accent-light), rgba(16,185,129,0.08))',
                    borderRadius: 12, border: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Total Pembayaran</span>
                  <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--accent)' }}>
                    Rp {totalHarga.toLocaleString('id-ID')}
                  </span>
                </motion.div>
              )}
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={15} /> Kembali
              </button>
              <motion.button
                className="btn btn-primary"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (validItems.length === 0) { toast.error('Minimal 1 produk harus diisi!'); return }
                  setStep(3)
                }}
              >
                Preview Invoice <ChevronRight size={15} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Preview Invoice ── */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body" style={{ padding: '14px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Preview Invoice</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Cek kembali sebelum disimpan. Setelah disimpan kamu bisa kirim WA, download, atau print.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => setStep(2)}>
                      <ArrowLeft size={15} /> Edit
                    </button>
                    <motion.button
                      className="btn btn-primary"
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading
                        ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Menyimpan...</>
                        : <><Save size={15} /> Simpan Invoice</>
                      }
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Preview */}
            <div style={{ overflowX: 'auto', background: 'var(--bg-tertiary)', borderRadius: 16, padding: 24 }}>
              <div style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.25)', borderRadius: 8, display: 'inline-block', minWidth: '794px' }}>
                <InvoiceTemplate ref={invoiceRef} order={previewOrder} />
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Hidden invoice for auto-upload after save */}
      <div id="hidden-invoice-render" style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <InvoiceTemplate order={previewOrder} />
      </div>
    </motion.div>
  )
}
