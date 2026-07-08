import { forwardRef } from 'react'

/**
 * InvoiceTemplate
 * Mirip dengan PDF Bhinneka Production.
 * Props:
 *   order: { customer_name, customer_phone, created_at, notes, id, order_items: [{ item_name, quantity, unit_price, notes }] }
 *   invoiceNumber: string (opsional, auto-generate dari id)
 */
const InvoiceTemplate = forwardRef(function InvoiceTemplate({ order }, ref) {
  if (!order) return null

  const items = order.order_items || []
  const invoiceNo = order.invoice_number ||
    `${String(items.length || 1).padStart(3, '0')}.${new Date(order.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.')}`

  const totalHarga = items.reduce((sum, it) => sum + ((it.unit_price || 0) * (it.quantity || 1)), 0)

  const formatRupiah = (n) => {
    if (!n) return '-'
    return n.toLocaleString('id-ID')
  }

  const formatTanggal = (d) => new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  const terms = [
    'DP Minimal 50% dari total tagihan dan harus lunas sebelum produk diambil.',
    'Revisi hanya berlaku 1 kali setelah ACC desain.',
    'Ongkir di tanggung pembeli.',
    'Komplain produk hanya berlaku 1x24 jam setelah produk diterima.',
    'Apabila ada perubahan desain setelah ACC akan dikenakan biaya tambahan.',
  ]

  return (
    <div
      ref={ref}
      id="invoice-print-area"
      style={{
        background: '#fff',
        color: '#1a1a1a',
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        width: '794px',          // A4 width in px at 96dpi
        minHeight: '1123px',     // A4 height
        padding: '40px 48px',
        boxSizing: 'border-box',
        position: 'relative',
        fontSize: 13,
      }}
    >
      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        {/* Left: Company info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 10, overflow: 'hidden',
              background: '#f1f1f1', flexShrink: 0,
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none' }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#111', letterSpacing: -0.5 }}>
                BHINNEKA PRODUCTION
              </div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                Print & Creative Studio
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#555', lineHeight: 1.8 }}>
            <div>📍 Jl. Contoh No. 123, Kota Bandung</div>
            <div>📱 WhatsApp: 0812-xxxx-xxxx</div>
            <div>📧 bhinneka@email.com</div>
          </div>
        </div>

        {/* Right: Invoice box */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'inline-block',
            background: '#1e293b',
            color: 'white',
            padding: '6px 28px',
            borderRadius: 6,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 3,
            marginBottom: 10,
          }}>
            INVOICE
          </div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <span style={{ fontWeight: 700, color: '#333' }}>No. Faktur</span>
              <span style={{ fontFamily: 'monospace', color: '#6366f1', fontWeight: 700 }}>{invoiceNo}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <span style={{ fontWeight: 700, color: '#333' }}>Tanggal</span>
              <span>{formatTanggal(order.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, #6366f1, #10b981)', borderRadius: 99, marginBottom: 20 }} />

      {/* ═══ KEPADA ═══ */}
      <div style={{
        background: '#f8f9fb',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '14px 18px',
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          Ditujukan Kepada Yth.
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#111', marginBottom: 4 }}>
          {order.customer_name || '-'}
        </div>
        {order.customer_phone && (
          <div style={{ fontSize: 12, color: '#555' }}>📱 {order.customer_phone}</div>
        )}
        {order.notes && (
          <div style={{ fontSize: 12, color: '#555', marginTop: 4, fontStyle: 'italic' }}>
            Catatan: {order.notes}
          </div>
        )}
      </div>

      {/* ═══ TABLE ═══ */}
      <table style={{
        width: '100%', borderCollapse: 'collapse', marginBottom: 0,
        fontSize: 13,
      }}>
        <thead>
          <tr style={{ background: '#1e293b', color: 'white' }}>
            <th style={{ padding: '10px 12px', textAlign: 'center', width: 36, borderRadius: '6px 0 0 0' }}>No</th>
            <th style={{ padding: '10px 12px', textAlign: 'left' }}>Produk / Deskripsi</th>
            <th style={{ padding: '10px 12px', textAlign: 'center', width: 60 }}>Jumlah</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', width: 120 }}>Harga Satuan</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', width: 130, borderRadius: '0 6px 0 0' }}>Harga Total</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#aaa', fontStyle: 'italic' }}>
                Tidak ada item
              </td>
            </tr>
          ) : items.map((it, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#888' }}>{i + 1}</td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, color: '#111' }}>{it.item_name || '-'}</div>
                {it.notes && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{it.notes}</div>}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{it.quantity || 1}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#555' }}>
                {it.unit_price ? `Rp ${formatRupiah(it.unit_price)}` : '-'}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                {it.unit_price ? `Rp ${formatRupiah((it.unit_price || 0) * (it.quantity || 1))}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#1e293b', color: 'white' }}>
            <td colSpan={3} />
            <td style={{ padding: '12px', fontWeight: 700, textAlign: 'right', fontSize: 14 }}>
              Total Pembayaran
            </td>
            <td style={{ padding: '12px', fontWeight: 900, textAlign: 'right', fontSize: 16, color: '#10b981' }}>
              {totalHarga > 0 ? `Rp ${formatRupiah(totalHarga)}` : '-'}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ═══ BODY BAWAH: Catatan + Pembayaran + TTD ═══ */}
      <div style={{ display: 'flex', gap: 20, marginTop: 24, alignItems: 'flex-start' }}>
        {/* Catatan */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#333', textTransform: 'uppercase',
            letterSpacing: 0.5, marginBottom: 8,
          }}>
            Syarat &amp; Ketentuan
          </div>
          <div style={{
            background: '#f8f9fb', border: '1px solid #e2e8f0',
            borderRadius: 8, padding: '12px 14px',
          }}>
            {terms.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < terms.length - 1 ? 6 : 0, fontSize: 11, color: '#555', lineHeight: 1.5 }}>
                <span style={{ color: '#6366f1', fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Pembayaran + TTD */}
        <div style={{ width: 220, flexShrink: 0 }}>
          {/* Pembayaran */}
          <div style={{
            border: '2px solid #6366f1', borderRadius: 10,
            overflow: 'hidden', marginBottom: 16,
          }}>
            <div style={{
              background: '#6366f1', color: 'white', padding: '8px 12px',
              fontSize: 12, fontWeight: 800, textAlign: 'center', letterSpacing: 0.5,
            }}>
              INFO PEMBAYARAN
            </div>
            <div style={{ padding: '12px', background: '#f8f9fb', fontSize: 12, lineHeight: 2 }}>
              <div style={{ fontWeight: 700, color: '#333', marginBottom: 4 }}>Transfer Bank BCA</div>
              <div style={{
                fontFamily: 'monospace', fontSize: 15, fontWeight: 900,
                color: '#1e293b', letterSpacing: 1,
              }}>
                5490327187
              </div>
              <div style={{ color: '#555' }}>a/n <strong>Saputra Malik</strong></div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#888' }}>
                Kirim bukti transfer via WhatsApp setelah pembayaran.
              </div>
            </div>
          </div>

          {/* Tanda Tangan */}
          <div style={{ textAlign: 'center', fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: '#333', marginBottom: 4 }}>Hormat Kami,</div>
            <div style={{ fontWeight: 800, color: '#555', marginBottom: 48 }}>Bhinneka Production</div>
            <div style={{ borderTop: '1.5px solid #333', paddingTop: 6 }}>
              <div style={{ fontWeight: 800, color: '#111' }}>Saputra Malik M.I.Kom</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 32, paddingTop: 12, borderTop: '1px solid #e2e8f0',
        textAlign: 'center', fontSize: 11, color: '#aaa',
      }}>
        Terima kasih atas kepercayaan Anda kepada Bhinneka Production ✨
      </div>
    </div>
  )
})

export default InvoiceTemplate
