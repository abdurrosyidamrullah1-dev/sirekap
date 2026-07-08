import { forwardRef } from 'react'

/**
 * InvoiceTemplate
 * Format identik 100% dengan referensi PDF Bhinneka Production.
 */
const InvoiceTemplate = forwardRef(function InvoiceTemplate({ order }, ref) {
  if (!order) return null

  const items = order.order_items || []
  
  // Format invoice no
  const invoiceNo = order.invoice_number ||
    `${String(items.length || 1).padStart(3, '0')}.${new Date(order.created_at || new Date()).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.')}`

  const totalHarga = items.reduce((sum, it) => sum + ((it.unit_price || 0) * (it.quantity || 1)), 0)

  const formatRupiah = (n) => {
    if (!n && n !== 0) return '-'
    return `Rp ${n.toLocaleString('id-ID')},-`
  }

  return (
    <div
      ref={ref}
      id="invoice-print-area"
      style={{
        background: '#fff',
        color: '#000',
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        width: '794px',          // A4 width in px at 96dpi
        minHeight: '1123px',     // A4 height
        padding: '50px 50px',
        boxSizing: 'border-box',
        position: 'relative',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {/* ═══ HEADER ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        {/* Left: Logo */}
        <div style={{ width: '280px' }}>
          <img 
            src="/logo.png" 
            alt="Bhinneka Production" 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
            onError={e => { 
              e.target.style.display = 'none'; 
              e.target.nextSibling.style.display = 'block'; 
            }} 
          />
          <div style={{ display: 'none', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>BHINNEKA</div>
            <div style={{ fontSize: 14 }}>PRODUCTION</div>
            <div style={{ fontSize: 9, marginTop: 4 }}>SEMINAR KIT | SOUVENIR | PROMOSI | PRINTING</div>
          </div>
        </div>

        {/* Right: Invoice Info */}
        <div style={{ textAlign: 'center', width: '250px' }}>
          <div style={{
            background: '#6b7280', /* Gray background for INVOICE box as per PDF */
            color: 'white',
            padding: '2px 0',
            fontSize: 18,
            fontWeight: 'bold',
            letterSpacing: 1,
            width: '180px',
            margin: '0 auto',
            border: '1px solid #4b5563'
          }}>
            INVOICE
          </div>
          <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 4, marginBottom: 12 }}>
            {invoiceNo}
          </div>
          
          <div style={{ textAlign: 'left', paddingLeft: '10px' }}>
            <div style={{ fontSize: 14 }}>Ditujukan Kepada Yth :</div>
            <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 8 }}>
              {order.customer_name}
            </div>
            {order.customer_address && (
              <div style={{ fontSize: 13, marginTop: 2 }}>{order.customer_address}</div>
            )}
            {order.customer_phone && (
              <div style={{ fontSize: 13, marginTop: 2 }}>{order.customer_phone}</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TABLE ═══ */}
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        marginBottom: 20,
        border: '1px solid #000'
      }}>
        <thead>
          <tr style={{ background: '#b0b5b9' }}>
            <th style={{ border: '1px solid #000', padding: '6px 8px', width: '5%', textAlign: 'center' }}>No</th>
            <th style={{ border: '1px solid #000', padding: '6px 8px', width: '45%', textAlign: 'center' }}>Produk</th>
            <th style={{ border: '1px solid #000', padding: '6px 8px', width: '15%', textAlign: 'center' }}>Jumlah</th>
            <th style={{ border: '1px solid #000', padding: '6px 8px', width: '15%', textAlign: 'center' }}>Harga Satuan</th>
            <th style={{ border: '1px solid #000', padding: '6px 8px', width: '20%', textAlign: 'center' }}>Harga Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>
                {index + 1}.
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 8px' }}>
                {item.item_name}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>
                {item.quantity} Pcs
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 8px', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rp</span>
                  <span>{item.unit_price ? item.unit_price.toLocaleString('id-ID') + ',-' : '-'}</span>
                </div>
              </td>
              <td style={{ border: '1px solid #000', padding: '6px 8px', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rp</span>
                  <span>{((item.unit_price || 0) * (item.quantity || 1)).toLocaleString('id-ID')},-</span>
                </div>
              </td>
            </tr>
          ))}
          <tr style={{ background: '#b0b5b9', fontWeight: 'bold' }}>
            <td colSpan={4} style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center' }}>
              Total Pembayaran
            </td>
            <td style={{ border: '1px solid #000', padding: '6px 8px', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Rp</span>
                <span>{totalHarga.toLocaleString('id-ID')},-</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ CATATAN ═══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 'bold', fontStyle: 'italic' }}>Catatan:</div>
        <ul style={{ margin: '4px 0 0 20px', padding: 0, listStyleType: 'disc' }}>
          <li>Pengerjaan akan dilakukan setelah melakukan transaksi.</li>
          <li>Pembayaran DP hanya utk pembelian min Rp 3.000.000.</li>
          <li>Barang yang sudah di beli tidak dapat di kembalikan/diuangkan</li>
          <li>Revisi design maksimal 3x revisi.</li>
          <li>Pengiriman di lakukan setelah melakukan pembayaran LUNAS.</li>
          <li>Free ongkir pengiriman area jakarta pembelian min Rp 2.000.000.</li>
          <li>Batas komplain maks 1x24jam &Sertakan vidio unboxing.</li>
        </ul>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 24 }}>
        {/* Left: Pembayaran */}
        <div style={{ width: '50%' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Pembayaran:</div>
          <div style={{ border: '1px solid #000', padding: '12px 16px', minHeight: '60px' }}>
            <div>Pembayaran dapat dilakukan melalui ATM Bank BCA</div>
            <div>No. Rek <span style={{ fontWeight: 'bold' }}>5490327187</span> a/n <span style={{ fontWeight: 'bold' }}>Saputra Malik</span></div>
          </div>
        </div>

        {/* Right: Signature */}
        <div style={{ width: '35%', textAlign: 'center', marginTop: '-20px' }}>
          <div style={{ marginBottom: 8 }}>Hormat Kami,</div>
          <div style={{ fontWeight: 'bold', marginBottom: 60 }}>Bhinneka Production</div>
          <div style={{ fontWeight: 'bold' }}>Saputra Malik M.I.Kom</div>
        </div>
      </div>
    </div>
  )
})

export default InvoiceTemplate
