import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, Download, Settings, Image as ImageIcon, Smartphone, CreditCard, Book, ZoomIn, Move, Palette, PenTool } from 'lucide-react'
import html2canvas from 'html2canvas-pro'
import toast from 'react-hot-toast'

const TEMPLATES = [
  { id: 'blocknote', name: 'Blocknote', icon: Book, ratio: 1/1.414 }, // A4/A5 ratio
  { id: 'idcard', name: 'ID Card', icon: CreditCard, ratio: 54/86 }, // ISO ID card
  { id: 'businesscard', name: 'Kartu Nama', icon: CreditCard, ratio: 90/55 },
  { id: 'smartphone', name: 'Layar HP', icon: Smartphone, ratio: 9/19.5 },
  { id: 'pen', name: 'Pulpen', icon: PenTool, ratio: 60/260 },
]

export default function MockupStudio() {
  const [image, setImage] = useState(null)
  const [template, setTemplate] = useState('blocknote')
  const [zoom, setZoom] = useState(100)
  const [posX, setPosX] = useState(50)
  const [posY, setPosY] = useState(50)
  const [bgColor, setBgColor] = useState('#f8fafc')
  const [isExporting, setIsExporting] = useState(false)
  const mockupRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setImage(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleExport = async () => {
    if (!mockupRef.current || !image) return toast.error('Upload gambar dulu!')
    
    setIsExporting(true)
    const toastId = toast.loading('Memproses Mockup...')
    
    try {
      const canvas = await html2canvas(mockupRef.current, {
        scale: 3, // High resolution
        useCORS: true,
        backgroundColor: bgColor
      })
      
      const link = document.createElement('a')
      link.download = `Mockup_${template}_${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      
      toast.success('Mockup berhasil disimpan!', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Gagal export mockup', { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  const renderTemplate = () => {
    const tpl = TEMPLATES.find(t => t.id === template)
    if (!tpl) return null

    const baseStyle = {
      position: 'relative',
      background: '#fff',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }

    const designLayer = image ? (
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${image})`,
        backgroundSize: `${zoom}%`,
        backgroundPosition: `${posX}% ${posY}%`,
        backgroundRepeat: 'no-repeat',
        zIndex: 10
      }} />
    ) : (
      <div style={{ color: 'var(--text-muted)', fontSize: 14, zIndex: 10 }}>Area Desain</div>
    )

    if (template === 'blocknote') {
      return (
        <div style={{ ...baseStyle, width: 300, height: 300 / tpl.ratio, borderRadius: 4, marginTop: 20 }}>
          {/* Wire-o Binding Mockup */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20, zIndex: 20, display: 'flex', justifyContent: 'space-evenly', paddingTop: 4 }}>
            {Array.from({length: 12}).map((_, i) => (
              <div key={i} style={{ width: 10, height: 24, background: 'linear-gradient(to right, #94a3b8, #cbd5e1, #94a3b8)', borderRadius: 4, marginTop: -12, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
            ))}
          </div>
          {/* Holes */}
          <div style={{ position: 'absolute', top: 8, left: 0, right: 0, zIndex: 15, display: 'flex', justifyContent: 'space-evenly' }}>
            {Array.from({length: 12}).map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, background: '#1e293b', borderRadius: '50%', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }} />
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 10%, rgba(0,0,0,0.05) 95%, rgba(0,0,0,0.15) 100%)', zIndex: 12, pointerEvents: 'none' }} />
          {designLayer}
        </div>
      )
    }

    if (template === 'idcard') {
      return (
        <div style={{ ...baseStyle, width: 220, height: 220 / tpl.ratio, borderRadius: 12 }}>
          {/* Lanyard Hole */}
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 45, height: 12, background: bgColor, borderRadius: 6, zIndex: 20, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }} />
          {/* Clip shadow */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 18, background: 'linear-gradient(to bottom, #94a3b8, #cbd5e1)', borderRadius: 2, zIndex: 15, marginTop: -10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
          {/* Reflection */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 40%)', zIndex: 12, pointerEvents: 'none' }} />
          {designLayer}
        </div>
      )
    }

    if (template === 'businesscard') {
      return (
        <div style={{ ...baseStyle, width: 380, height: 380 / tpl.ratio, borderRadius: 4 }}>
           {/* Reflection */}
           <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, rgba(255,255,255,0.2), rgba(0,0,0,0.05))', zIndex: 12, pointerEvents: 'none' }} />
          {designLayer}
        </div>
      )
    }

    if (template === 'smartphone') {
      return (
        <div style={{ ...baseStyle, width: 260, height: 260 / tpl.ratio, borderRadius: 36, border: '12px solid #0f172a', boxShadow: 'inset 0 0 0 2px #334155, 0 25px 50px -12px rgba(0,0,0,0.3)' }}>
          {/* Notch */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 100, height: 24, background: '#0f172a', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, zIndex: 20 }} />
          {/* Glare */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 40%)', zIndex: 12, pointerEvents: 'none' }} />
          {designLayer}
        </div>
      )
    }

    if (template === 'pen') {
      return (
        <div style={{ ...baseStyle, width: 160, height: 600, background: 'transparent', boxShadow: 'none', overflow: 'visible', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: 20 }}>
          
          {/* Clicker (Silver Top) */}
          <div style={{ width: 22, height: 28, background: 'linear-gradient(to right, #64748b, #e2e8f0, #475569)', borderRadius: '6px 6px 0 0', zIndex: 10, margin: '0 auto', boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.8)' }} />
          
          {/* Black Top Cap & Clip */}
          <div style={{ width: 60, height: 45, background: 'linear-gradient(to right, #020617, #1e293b, #020617)', borderRadius: '16px 16px 0 0', zIndex: 11, margin: '0 auto', position: 'relative' }}>
            {/* The Clip */}
            <div style={{ position: 'absolute', top: 12, left: -14, width: 20, height: 160, background: 'linear-gradient(to right, #020617, #334155, #0f172a)', borderRadius: '8px 0 50% 12px', zIndex: 12, borderRight: '2px solid #020617', boxShadow: '-5px 10px 15px rgba(0,0,0,0.4)' }} />
          </div>
          
          {/* Main Body (Design Area) */}
          <div style={{ width: 60, height: 260, background: '#fff', position: 'relative', overflow: 'hidden', zIndex: 10, margin: '0 auto' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(255,255,255,0.8) 30%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0.45) 100%)', zIndex: 15, pointerEvents: 'none' }} />
            {designLayer}
          </div>

          {/* Grip (Black Ribbed) */}
          <div style={{ width: 60, height: 110, background: 'linear-gradient(to right, #020617, #1e293b, #020617)', zIndex: 11, margin: '0 auto', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '15px 0', borderBottomLeftRadius: '15px 80px', borderBottomRightRadius: '15px 80px' }}>
            {Array.from({length: 8}).map((_, i) => (
              <div key={i} style={{ width: '100%', height: 4, background: 'rgba(0,0,0,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }} />
            ))}
          </div>

          {/* Silver Tip Base */}
          <div style={{ width: 30, height: 40, background: 'linear-gradient(to right, #64748b, #e2e8f0, #475569)', clipPath: 'polygon(0 0, 100% 0, 70% 100%, 30% 100%)', zIndex: 10, margin: '0 auto' }} />
          
          {/* Pen Point */}
          <div style={{ width: 8, height: 16, background: 'linear-gradient(to right, #475569, #cbd5e1, #334155)', borderRadius: '0 0 6px 6px', zIndex: 9, margin: '0 auto' }} />
          
          {/* Shadow below pen */}
          <div style={{ width: 80, height: 15, background: 'rgba(0,0,0,0.2)', borderRadius: '50%', filter: 'blur(5px)', zIndex: 5, margin: '8px auto 0' }} />
        </div>
      )
    }

    return null
  }

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="page-header-left">
          <h1>Mockup Studio 🎨</h1>
          <p>Buat preview realistis untuk desain secara instan</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleExport}
          disabled={!image || isExporting}
        >
          {isExporting ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Download size={15} />}
          Export Mockup
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, height: 'calc(100vh - 160px)' }}>
        {/* Controls */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="card-header"><Settings size={18} style={{ color: 'var(--accent)' }}/> Konfigurasi</div>
          <div className="card-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Upload */}
            <div>
              <label className="form-label">Gambar Desain</label>
              <div style={{ 
                border: '2px dashed var(--border)', borderRadius: 10, padding: 20, 
                textAlign: 'center', cursor: 'pointer', background: 'var(--bg-tertiary)',
                position: 'relative', transition: 'all 0.2s'
              }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
                <ImageIcon size={28} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Klik / Drop gambar di sini</div>
                {image && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>Gambar ter-upload ✓</div>}
              </div>
            </div>

            {/* Templates */}
            <div>
              <label className="form-label">Pilih Template</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TEMPLATES.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    style={{ 
                      padding: '10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      border: `1px solid ${template === t.id ? 'var(--accent)' : 'var(--border)'}`,
                      background: template === t.id ? 'var(--accent-light)' : 'transparent',
                      color: template === t.id ? 'var(--accent)' : 'var(--text-secondary)'
                    }}
                  >
                    <t.icon size={20} style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Adjustments */}
            {image && (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}><ZoomIn size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> Scale ({zoom}%)</label>
                  </div>
                  <input type="range" min="10" max="300" value={zoom} onChange={e => setZoom(e.target.value)} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}><Move size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> Posisi X ({posX}%)</label>
                  </div>
                  <input type="range" min="0" max="100" value={posX} onChange={e => setPosX(e.target.value)} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}><Move size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', transform: 'rotate(90deg)' }}/> Posisi Y ({posY}%)</label>
                  </div>
                  <input type="range" min="0" max="100" value={posY} onChange={e => setPosY(e.target.value)} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
              </>
            )}

            <div>
              <label className="form-label"><Palette size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> Background Color</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['#f8fafc', '#0f172a', '#e2e8f0', '#fee2e2', '#dcfce7', '#dbeafe'].map(c => (
                  <div 
                    key={c} 
                    onClick={() => setBgColor(c)}
                    style={{ 
                      width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: bgColor === c ? '2px solid var(--accent)' : '1px solid var(--border)'
                    }} 
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Preview Area */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h10v10H0zm10 10h10v10H10z\' fill=\'%23e2e8f0\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")', overflow: 'hidden' }}>
          
          {/* The actual element being captured */}
          <div 
            ref={mockupRef}
            style={{ 
              width: 800, height: 600, 
              background: bgColor, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.3s'
            }}
          >
            {renderTemplate()}
          </div>

        </div>
      </div>
    </motion.div>
  )
}
