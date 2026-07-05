import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, X, FileText, Image, File, Music, Video,
  Loader2, Grid, List, ExternalLink, Trash2, Download,
  FolderOpen, Eye, Search, SortAsc
} from 'lucide-react'
import { uploadFileToDrive, createOrderFolder, isGoogleSignedIn, getDriveFilesByFolder, deleteDriveFile } from '../lib/drive'
import { addOrderFile, deleteOrderFile, updateOrder } from '../lib/supabase'
import toast from 'react-hot-toast'

const FILE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  pdf: FileText,
  text: FileText,
  default: File,
}

const getFileCategory = (mimeType = '', name = '') => {
  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) return 'image'
  if (mimeType.startsWith('video/') || /\.(mp4|mov|avi|mkv)$/i.test(name)) return 'video'
  if (mimeType.startsWith('audio/') || /\.(mp3|wav|flac)$/i.test(name)) return 'audio'
  if (mimeType === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf'
  return 'default'
}

const formatBytes = (bytes) => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

// ─── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ file, onClose }) {
  const cat = getFileCategory(file.mimeType, file.file_name)
  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.85 }} animate={{ scale: 1 }}
        style={{ maxWidth: '85vw', maxHeight: '85vh', position: 'relative' }}
      >
        {/* Controls */}
        <div style={{
          position: 'absolute', top: -48, right: 0,
          display: 'flex', gap: 8,
        }}>
          {file.drive_file_url && (
            <a href={file.drive_file_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              <ExternalLink size={13} /> Buka di Drive
            </a>
          )}
          <button className="btn btn-secondary btn-sm" onClick={onClose}><X size={13} /> Tutup</button>
        </div>

        {cat === 'image' && file.drive_file_url ? (
          <img
            src={`https://drive.google.com/uc?id=${file.drive_file_id}&export=view`}
            alt={file.file_name}
            style={{ maxWidth: '85vw', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: '48px 64px',
            textAlign: 'center', border: '1px solid var(--border)',
          }}>
            {(() => { const Icon = FILE_ICONS[cat] || File; return <Icon size={64} style={{ color: 'var(--accent)', marginBottom: 16 }} /> })()}
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>{file.file_name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Preview tidak tersedia untuk tipe file ini</div>
            {file.drive_file_url && (
              <a href={file.drive_file_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
                <ExternalLink size={14} /> Buka di Drive
              </a>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
          {file.file_name}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main FileManager ──────────────────────────────────────────────────────────
export default function FileManager({ order, onFilesChanged }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState([])
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [preview, setPreview] = useState(null)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)
  const inputRef = useRef()

  const files = (order.order_files || []).filter(f =>
    !search || f.file_name.toLowerCase().includes(search.toLowerCase())
  )

  // ─── Upload ───────────────────────────────────────────────────────
  const processFiles = useCallback(async (rawFiles) => {
    if (!isGoogleSignedIn()) {
      toast.error('Hubungkan Google Drive dulu di sidebar! Klik ikon Drive di bawah kiri.', { duration: 5000 })
      return
    }

    for (const file of Array.from(rawFiles)) {
      const name = file.name
      setUploading(prev => [...prev, name])
      try {
        let folderId = order.drive_folder_id
        let folderUrl = order.drive_folder_url

        if (!folderId) {
          const folder = await createOrderFolder(order.customer_name, order.id)
          folderId = folder.id
          folderUrl = folder.url
          await updateOrder(order.id, { drive_folder_id: folderId, drive_folder_url: folderUrl })
        }

        const result = await uploadFileToDrive(file, folderId)

        const record = await addOrderFile({
          order_id: order.id,
          file_name: file.name,
          drive_file_id: result.id,
          drive_file_url: result.webViewLink,
          mime_type: file.type,
          file_size: file.size,
        })

        onFilesChanged('add', { ...record, drive_file_id: result.id, drive_file_url: result.webViewLink })
        toast.success(`✅ ${name} berhasil diupload!`)
      } catch (err) {
        toast.error(`❌ Gagal upload ${name}: ${err.message}`)
      } finally {
        setUploading(prev => prev.filter(n => n !== name))
      }
    }
  }, [order, onFilesChanged])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    processFiles(e.dataTransfer.files)
  }

  // ─── Delete ───────────────────────────────────────────────────────
  const handleDelete = async (file) => {
    if (deleting) return
    if (!confirm(`Hapus "${file.file_name}" dari record? (File di Drive tidak terhapus)`)) return
    setDeleting(file.id)
    try {
      await deleteOrderFile(file.id)
      onFilesChanged('remove', file)
      toast.success('File dihapus dari record')
    } catch {
      toast.error('Gagal hapus file')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteDrive = async (file) => {
    if (deleting) return
    if (!isGoogleSignedIn()) { toast.error('Login Google Drive dulu'); return }
    if (!confirm(`Hapus "${file.file_name}" dari Google Drive dan record?`)) return
    setDeleting(file.id)
    try {
      if (file.drive_file_id) await deleteDriveFile(file.drive_file_id)
      await deleteOrderFile(file.id)
      onFilesChanged('remove', file)
      toast.success('File dihapus dari Drive & record')
    } catch (e) {
      toast.error('Gagal hapus: ' + e.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      {/* Upload Zone */}
      <motion.div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        style={{ marginBottom: 16, cursor: 'pointer' }}
      >
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
          onChange={e => { processFiles(e.target.files); e.target.value = '' }}
          accept="image/*,.pdf,.ai,.psd,.svg,.eps,.cdr,.zip,.rar" />
        <motion.div
          className="upload-zone-icon"
          animate={dragOver ? { scale: 1.2, rotate: 15 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <Upload size={24} />
        </motion.div>
        <h4>Drop file desain di sini</h4>
        <p>PNG, JPG, PDF, AI, PSD, SVG, CDR, ZIP — klik atau drag</p>
      </motion.div>

      {/* Uploading progress */}
      <AnimatePresence>
        {uploading.map(name => (
          <motion.div key={name} className="file-item"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: 6, borderColor: 'var(--blue-300)' }}
          >
            <div className="file-icon"><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /></div>
            <div className="file-name">{name}</div>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Mengupload ke Drive...</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Toolbar */}
      {files.length > 0 || search ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input" placeholder="Cari file..."
              style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['grid','list'].map(m => (
              <motion.button key={m} onClick={() => setViewMode(m)}
                className={`btn btn-secondary btn-icon btn-sm`}
                style={{ background: viewMode === m ? 'var(--accent)' : undefined, color: viewMode === m ? 'white' : undefined }}
                whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
              >
                {m === 'grid' ? <Grid size={14} /> : <List size={14} />}
              </motion.button>
            ))}
          </div>
        </div>
      ) : null}

      {/* File count summary */}
      {order.order_files?.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', gap: 12 }}>
          <span>{order.order_files.length} file total</span>
          {order.drive_folder_url && (
            <a href={order.drive_folder_url} target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FolderOpen size={12} /> Lihat folder Drive
            </a>
          )}
        </div>
      )}

      {/* Empty */}
      {files.length === 0 && !uploading.length && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          {search ? 'File tidak ditemukan' : 'Belum ada file. Upload file di atas!'}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && files.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          <AnimatePresence>
            {files.map((file, i) => {
              const cat = getFileCategory(file.mime_type, file.file_name)
              const Icon = FILE_ICONS[cat] || File
              const isImg = cat === 'image'
              return (
                <motion.div key={file.id}
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  whileHover={{ y: -3, boxShadow: 'var(--shadow-md)', borderColor: 'var(--blue-200)' }}
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => setPreview(file)}
                    style={{
                      height: 90, background: 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', position: 'relative',
                    }}
                  >
                    {isImg && file.drive_file_id ? (
                      <img
                        src={`https://drive.google.com/thumbnail?id=${file.drive_file_id}&sz=w200`}
                        alt={file.file_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <Icon size={36} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                    )}
                    {/* Hover overlay */}
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(37,99,235,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s',
                    }}
                      className="file-grid-overlay"
                    >
                      <Eye size={20} style={{ color: 'white' }} />
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                      {file.file_name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatBytes(file.file_size)}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {file.drive_file_url && (
                          <a href={file.drive_file_url} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ color: 'var(--text-muted)', display: 'flex', padding: 2 }}
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                        <button onClick={e => { e.stopPropagation(); handleDelete(file) }}
                          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence>
            {files.map((file, i) => {
              const cat = getFileCategory(file.mime_type, file.file_name)
              const Icon = FILE_ICONS[cat] || File
              return (
                <motion.div key={file.id} className="file-item"
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="file-icon">
                    {cat === 'image' && file.drive_file_id ? (
                      <img
                        src={`https://drive.google.com/thumbnail?id=${file.drive_file_id}&sz=w64`}
                        alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : <Icon size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="file-name">{file.file_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatBytes(file.file_size)} · {new Date(file.uploaded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <motion.button onClick={() => setPreview(file)} className="btn btn-ghost btn-icon" style={{ padding: 6 }} whileHover={{ scale: 1.1 }}>
                      <Eye size={14} />
                    </motion.button>
                    {file.drive_file_url && (
                      <motion.a href={file.drive_file_url} target="_blank" rel="noreferrer"
                        className="btn btn-ghost btn-icon" style={{ padding: 6 }} whileHover={{ scale: 1.1 }}
                      >
                        <ExternalLink size={14} />
                      </motion.a>
                    )}
                    <motion.button onClick={() => handleDelete(file)}
                      className="btn btn-ghost btn-icon" style={{ padding: 6, color: 'var(--text-muted)' }}
                      whileHover={{ scale: 1.1, color: 'var(--danger)' }}
                      disabled={deleting === file.id}
                    >
                      {deleting === file.id ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Trash2 size={14} />}
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>

      <style>{`.file-grid-overlay { opacity: 0 !important; } div:hover > .file-grid-overlay { opacity: 1 !important; }`}</style>
    </div>
  )
}
