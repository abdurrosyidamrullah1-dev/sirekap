import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, Search, HardDrive, File, FileText,
  Image, Video, Music, ExternalLink, Loader2, Grid, List, AlertCircle, Trash2, X, Plus, Upload, FolderUp, CheckSquare, RefreshCw
} from 'lucide-react'
import { getAllOrderFolders, getDriveFilesByFolder, isGoogleSignedIn, deleteDriveFile, createFolder, uploadFileToDrive } from '../lib/drive'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'

const FILE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  pdf: FileText,
  text: FileText,
  folder: FolderOpen,
  default: File,
}

const getFileCategory = (mimeType = '', name = '') => {
  if (mimeType === 'application/vnd.google-apps.folder') return 'folder'
  if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) return 'image'
  if (mimeType.startsWith('video/') || /\.(mp4|mov|avi|mkv)$/i.test(name)) return 'video'
  if (mimeType.startsWith('audio/') || /\.(mp3|wav|flac)$/i.test(name)) return 'audio'
  if (mimeType === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf'
  return 'default'
}

const getFileBadge = (name = '') => {
  if (!name.includes('.')) return null
  const ext = name.split('.').pop().toLowerCase()
  switch (ext) {
    case 'pdf': return { label: 'PDF', color: '#ef4444' } // red
    case 'png': return { label: 'PNG', color: '#10b981' } // green
    case 'jpg': 
    case 'jpeg': return { label: 'JPG', color: '#3b82f6' } // blue
    case 'tif':
    case 'tiff': return { label: 'TIF', color: '#8b5cf6' } // purple
    case 'cdr': return { label: 'CDR', color: '#14b8a6' } // teal
    case 'ai': return { label: 'AI', color: '#f97316' } // orange
    case 'psd': return { label: 'PSD', color: '#0ea5e9' } // light blue
    case 'zip':
    case 'rar': return { label: 'ZIP', color: '#6b7280' } // gray
    case 'svg': return { label: 'SVG', color: '#fbbf24' } // yellow
    default: 
      return ext.length <= 4 ? { label: ext.toUpperCase(), color: '#6366f1' } : null
  }
}

const formatBytes = (bytes) => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

export default function DriveManager() {
  const [folders, setFolders] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [currentRightFolder, setCurrentRightFolder] = useState(null) // Added for subfolder navigation
  
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [selectedFile, setSelectedFile] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, target: null })

  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadingFolder, setUploadingFolder] = useState(false)
  
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [dragSelecting, setDragSelecting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, file: null })

  const [dragOver, setDragOver] = useState(false)
  const [uploadModal, setUploadModal] = useState({ isOpen: false, files: null })
  const [uploadClientName, setUploadClientName] = useState('')

  const connected = isGoogleSignedIn()

  const loadRightFiles = async (folderId) => {
    setLoadingFiles(true)
    setFiles([])
    try {
      const data = await getDriveFilesByFolder(folderId)
      setFiles(data)
    } catch (err) {
      console.error('Failed to load files:', err)
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleRefresh = async () => {
    if (!connected) return
    setLoading(true)
    try {
      const data = await getAllOrderFolders()
      setFolders(data)
      if (currentRightFolder) {
        await loadRightFiles(currentRightFolder.id)
      }
    } catch (err) {
      console.error('Failed to refresh:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!connected) {
      setLoading(false)
      return
    }
    handleRefresh()
  }, [connected])

  useEffect(() => {
    const handleMouseUp = () => setDragSelecting(false)
    const handleClick = () => setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev)
    
    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
    const handleDragLeave = (e) => {
      if (e.clientX === 0 || e.clientY === 0) setDragOver(false)
    }
    const handleDrop = async (e) => {
      e.preventDefault()
      setDragOver(false)
      const droppedFiles = e.dataTransfer.files
      if (droppedFiles && droppedFiles.length > 0) {
        if (currentRightFolder) {
          setUploadingFile(true)
          try {
            let newFiles = []
            for (let i = 0; i < droppedFiles.length; i++) {
              const file = droppedFiles[i]
              setUploadProgress({ name: file.name, current: i + 1, total: droppedFiles.length, percent: 0 })
              const uploaded = await uploadFileToDrive(file, currentRightFolder.id, (percent) => {
                setUploadProgress(prev => prev ? { ...prev, percent } : null)
              })
              newFiles.push(uploaded)
            }
            setFiles(prev => [...newFiles, ...prev])
            toast.success(`${droppedFiles.length} file diupload ke ${currentRightFolder.name}`)
          } catch (err) {
            toast.error('Gagal upload file')
            console.error(err)
          } finally {
            setUploadingFile(false)
            setUploadProgress(null)
          }
        } else {
          setUploadModal({ isOpen: true, files: droppedFiles })
        }
      }
    }

    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('click', handleClick)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [currentRightFolder])

  const handleSelectFolder = async (folder) => {
    setSelectedFolder(folder)
    setCurrentRightFolder(folder)
    setSelectedFile(null)
    setSelectedFiles(new Set())
    loadRightFiles(folder.id)
  }


  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const folder = await createFolder(newFolderName)
      setFolders(prev => [folder, ...prev])
      setNewFolderName('')
      setCreatingFolder(false)
      toast.success('Folder berhasil dibuat')
      handleSelectFolder(folder)
    } catch (err) {
      toast.error('Gagal membuat folder')
      console.error(err)
    }
  }

  const handleUploadFile = async (e) => {
    const filesToUpload = e.target.files
    if (!filesToUpload || filesToUpload.length === 0 || !currentRightFolder) return
    
    setUploadingFile(true)
    try {
      let newFiles = []
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i]
        setUploadProgress({ name: file.name, current: i + 1, total: filesToUpload.length, percent: 0 })
        const uploaded = await uploadFileToDrive(file, currentRightFolder.id, (percent) => {
          setUploadProgress(prev => prev ? { ...prev, percent } : null)
        })
        newFiles.push(uploaded)
      }
      setFiles(prev => [...newFiles, ...prev])
      toast.success(`${filesToUpload.length} file diupload`)
    } catch (err) {
      toast.error('Gagal upload file')
      console.error(err)
    } finally {
      setUploadingFile(false)
      setUploadProgress(null)
      e.target.value = null
    }
  }

  const handleUploadFolder = async (e) => {
    const filesToUpload = e.target.files
    if (!filesToUpload || filesToUpload.length === 0) return
    
    const firstPath = filesToUpload[0].webkitRelativePath
    const folderName = firstPath ? firstPath.split('/')[0] : 'Folder Baru'
    
    setUploadingFolder(true)
    try {
      const folder = await createFolder(folderName)
      setFolders(prev => [folder, ...prev])
      setSelectedFolder(folder)
      setFiles([])
      
      let newFiles = []
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i]
        setUploadProgress({ name: file.name, current: i + 1, total: filesToUpload.length, percent: 0 })
        const uploaded = await uploadFileToDrive(file, folder.id, (percent) => {
          setUploadProgress(prev => prev ? { ...prev, percent } : null)
        })
        newFiles.push(uploaded)
      }
      setFiles(newFiles)
      toast.success(`Folder "${folderName}" berhasil diupload!`)
    } catch (err) {
      toast.error('Gagal upload folder')
      console.error(err)
    } finally {
      setUploadingFolder(false)
      setUploadProgress(null)
      e.target.value = null
    }
  }

  const handleDeleteFile = (file) => {
    setConfirmModal({ isOpen: true, type: 'file', target: file })
  }

  const handleDeleteFolder = (folder) => {
    setConfirmModal({ isOpen: true, type: 'folder', target: folder })
  }

  const handleBatchDeleteClick = () => {
    setConfirmModal({ isOpen: true, type: 'batch', target: null })
  }

  const confirmDelete = async () => {
    const { type, target } = confirmModal
    setDeleting(true)
    
    try {
      if (type === 'batch') {
        const filesToDelete = files.filter(f => selectedFiles.has(f.id))
        for (const file of filesToDelete) {
          await deleteDriveFile(file.id).catch(() => {})
        }
        setFiles(prev => prev.filter(f => !selectedFiles.has(f.id)))
        setSelectedFiles(new Set())
        setSelectedFile(null)
        toast.success(`${selectedFiles.size} file berhasil dihapus`)
      } else if (type === 'file') {
        await deleteDriveFile(target.id)
        setFiles(prev => prev.filter(f => f.id !== target.id))
        setSelectedFile(null)
        setSelectedFiles(prev => { const next = new Set(prev); next.delete(target.id); return next; })
        toast.success('File berhasil dihapus')
      } else {
        await deleteDriveFile(target.id)
        setFolders(prev => prev.filter(f => f.id !== target.id))
        setSelectedFolder(null)
        setFiles([])
        setSelectedFile(null)
        toast.success('Folder berhasil dihapus')
      }
      setConfirmModal({ isOpen: false, type: null, target: null })
    } catch (err) {
      console.error(err)
      toast.error(`Gagal menghapus ${type === 'folder' ? 'folder' : 'file'}`)
    } finally {
      setDeleting(false)
    }
  }

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  if (!connected) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <HardDrive size={64} style={{ color: 'var(--text-muted)', marginBottom: 20 }} />
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Google Drive Belum Terhubung</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, marginBottom: 24 }}>
          Hubungkan akun Google Drive kamu dari menu sidebar (pojok kiri bawah) untuk menggunakan fitur Drive Manager.
        </p>
      </div>
    )
  }

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div className="page-header" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-left">
          <h1>Drive Manager ☁️</h1>
          <p>Kelola semua file desain langsung dari Google Drive</p>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={loading || loadingFiles}
          className="btn btn-secondary"
          style={{ height: 40 }}
        >
          <RefreshCw size={16} className={loading || loadingFiles ? "spin" : ""} />
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Left Sidebar: Folders */}
        <div className="card" style={{ width: 340, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'block' }}>
            <div style={{ position: 'relative', width: '100%', display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  placeholder="Cari folder..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 38, fontSize: 13, height: 40, borderRadius: 99, background: 'var(--bg-tertiary)' }}
                />
              </div>
              <label 
                className="btn btn-secondary" 
                style={{ width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 99, flexShrink: 0, cursor: uploadingFolder ? 'not-allowed' : 'pointer' }}
                title="Upload Folder"
              >
                {uploadingFolder ? <Loader2 size={16} className="spin" /> : <FolderUp size={16} />}
                <input 
                  type="file" 
                  webkitdirectory="true" 
                  directory="true" 
                  multiple
                  onChange={handleUploadFolder}
                  style={{ display: 'none' }} 
                  disabled={uploadingFolder}
                />
              </label>
              <button 
                onClick={() => setCreatingFolder(true)}
                className="btn btn-primary" 
                style={{ width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 99, flexShrink: 0 }}
                title="Buat Folder Kosong"
              >
                <Plus size={18} />
              </button>
            </div>
            
            <AnimatePresence>
              {creatingFolder && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      autoFocus
                      className="form-input" 
                      placeholder="Nama folder baru..." 
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                      style={{ fontSize: 12, height: 32 }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleCreateFolder}>Buat</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setCreatingFolder(false)}><X size={14}/></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader2 size={24} className="spin" style={{ color: 'var(--accent)' }} />
              </div>
            ) : filteredFolders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                {search ? 'Folder tidak ditemukan' : 'Belum ada folder di Google Drive'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filteredFolders.map(folder => {
                  const isSelected = selectedFolder?.id === folder.id
                  return (
                    <motion.button
                      key={folder.id}
                      onClick={() => handleSelectFolder(folder)}
                      className={`nav-item ${isSelected ? 'active' : ''}`}
                      style={{ 
                        width: '100%', border: 'none', background: isSelected ? 'var(--accent-light)' : 'transparent',
                        padding: '12px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                      }}
                      whileHover={{ backgroundColor: isSelected ? '' : 'var(--bg-secondary)' }}
                    >
                      <FolderOpen size={18} style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {folder.name}
                        </div>
                        <div style={{ fontSize: 11, color: isSelected ? 'var(--accent)' : 'var(--text-muted)', marginTop: 2, opacity: 0.8 }}>
                          {new Date(folder.createdTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Content: Files */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedFolder ? (
            <>
              {/* Header */}
              <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {currentRightFolder?.id !== selectedFolder?.id && (
                    <button 
                      onClick={() => {
                        setCurrentRightFolder(selectedFolder)
                        loadRightFiles(selectedFolder.id)
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 10px', marginRight: 4 }}
                    >
                      ← Kembali
                    </button>
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FolderOpen size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{currentRightFolder?.name || selectedFolder.name}</h2>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {files.length} item ditemukan
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {selectedFiles.size > 0 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-tertiary)', padding: '4px 12px', borderRadius: 8, marginRight: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{selectedFiles.size} dipilih</span>
                      <button className="btn btn-sm btn-ghost" onClick={() => setSelectedFiles(new Set(files.map(f => f.id)))} style={{ fontSize: 11, padding: '4px 8px' }}>Pilih Semua</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setSelectedFiles(new Set())} style={{ fontSize: 11, padding: '4px 8px' }}>Batal</button>
                      <button className="btn btn-sm" onClick={handleBatchDeleteClick} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 11, padding: '4px 8px' }}>
                        <Trash2 size={12} style={{ marginRight: 4 }}/> Hapus
                      </button>
                    </div>
                  )}

                  <label className="btn btn-primary btn-sm" style={{ cursor: uploadingFile ? 'not-allowed' : 'pointer', padding: '6px 12px', fontSize: 12 }}>
                    {uploadingFile ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                    {uploadingFile ? 'Mengupload...' : 'Upload File'}
                    <input 
                      type="file" 
                      multiple
                      onChange={handleUploadFile}
                      style={{ display: 'none' }} 
                      disabled={uploadingFile}
                    />
                  </label>

                  <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: 4, borderRadius: 8 }}>
                    {['grid','list'].map(m => (
                      <button key={m} onClick={() => setViewMode(m)}
                        className="btn btn-ghost btn-sm"
                        style={{ 
                          background: viewMode === m ? 'var(--bg-card)' : 'transparent',
                          boxShadow: viewMode === m ? 'var(--shadow-sm)' : 'none',
                          color: viewMode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                          padding: '6px 10px',
                        }}
                      >
                        {m === 'grid' ? <Grid size={15} /> : <List size={15} />}
                      </button>
                    ))}
                  </div>
                  <a href={currentRightFolder?.webViewLink || selectedFolder.webViewLink} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                    <ExternalLink size={14} /> Buka Drive
                  </a>
                  <button 
                    onClick={() => handleDeleteFolder(currentRightFolder || selectedFolder)}
                    className="btn btn-sm"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 10px' }}
                    title="Hapus Folder"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress Bar Area */}
              <AnimatePresence>
                {uploadProgress && (
                  <motion.div className="file-item" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent-light)', display: 'block', padding: '16px 24px', borderRadius: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)' }}>
                        <Loader2 size={16} className="spin" /> 
                        Mengupload {uploadProgress.current} dari {uploadProgress.total} file
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>{uploadProgress.percent}%</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {uploadProgress.name}
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div style={{ height: '100%', background: 'var(--accent)', borderRadius: 3 }} initial={{ width: 0 }} animate={{ width: `${uploadProgress.percent}%` }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Files Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--bg-secondary)' }}>
                {loadingFiles ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Loader2 size={30} className="spin" style={{ color: 'var(--accent)' }} />
                  </div>
                ) : files.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    <File size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Folder kosong</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Belum ada file desain di folder ini</div>
                  </div>
                ) : (
                  viewMode === 'grid' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, userSelect: 'none' }}>
                      {files.map((file, i) => {
                        const cat = getFileCategory(file.mimeType, file.name)
                        const Icon = FILE_ICONS[cat] || File
                        const isImg = cat === 'image'
                        const isSelected = selectedFiles.has(file.id)
                        const isPreviewActive = selectedFile?.id === file.id
                        return (
                          <motion.div
                            key={file.id}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onMouseDown={(e) => {
                              if (e.target.closest('button') || e.target.closest('a')) return
                              if (e.detail === 2) { 
                                if (cat === 'folder') {
                                  setCurrentRightFolder(file)
                                  loadRightFiles(file.id)
                                } else {
                                  setSelectedFile(file)
                                }
                                return 
                              }
                              setDragSelecting(true)
                              setSelectedFiles(prev => {
                                const next = new Set(prev)
                                if (next.has(file.id)) next.delete(file.id)
                                else next.add(file.id)
                                return next
                              })
                            }}
                            onMouseEnter={() => {
                              if (dragSelecting) setSelectedFiles(prev => new Set([...prev, file.id]))
                            }}
                            onContextMenu={e => {
                              e.preventDefault()
                              setContextMenu({ visible: true, x: e.clientX, y: e.clientY, file })
                            }}
                            onDragStart={e => e.preventDefault()}
                            style={{
                              background: isSelected ? 'var(--accent-light)' : (isPreviewActive ? 'var(--bg-tertiary)' : 'var(--bg-card)'),
                              border: `1px solid ${isSelected ? 'var(--accent)' : (isPreviewActive ? 'var(--blue-400)' : 'var(--border)')}`,
                              borderRadius: 14, overflow: 'hidden', textDecoration: 'none', cursor: 'pointer',
                              color: 'inherit', display: 'flex', flexDirection: 'column', position: 'relative'
                            }}
                            whileHover={{ y: -4, boxShadow: 'var(--shadow-md)', borderColor: isSelected ? 'var(--accent)' : 'var(--blue-200)' }}
                          >
                            {isSelected && (
                              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, color: 'var(--accent)', background: 'white', borderRadius: 4, display: 'flex' }}>
                                <CheckSquare size={16} />
                              </div>
                            )}
                            <div style={{
                              height: 120, background: 'var(--bg-tertiary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              position: 'relative'
                            }}>
                              {isImg && file.thumbnailLink ? (
                                <img src={file.thumbnailLink} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable="false" />
                              ) : (
                                <Icon size={40} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                              )}
                              
                              {getFileBadge(file.name) && !isSelected && (
                                <div style={{ 
                                  position: 'absolute', top: 8, left: 8, 
                                  background: getFileBadge(file.name).color,
                                  color: 'white', padding: '2px 6px', borderRadius: 6,
                                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                  {getFileBadge(file.name).label}
                                </div>
                              )}
                              <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 6, color: 'white' }}>
                                <ExternalLink size={12} />
                              </div>
                            </div>
                            <div style={{ padding: '12px 14px' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                                {file.name}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                                <span>{formatBytes(file.size)}</span>
                                <span>{new Date(file.createdTime).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })}</span>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, userSelect: 'none' }}>
                      {files.map((file, i) => {
                        const cat = getFileCategory(file.mimeType, file.name)
                        const Icon = FILE_ICONS[cat] || File
                        const isSelected = selectedFiles.has(file.id)
                        const isPreviewActive = selectedFile?.id === file.id
                        return (
                          <motion.div
                            key={file.id}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            onMouseDown={(e) => {
                              if (e.target.closest('button') || e.target.closest('a')) return
                              if (e.detail === 2) { 
                                if (cat === 'folder') {
                                  setCurrentRightFolder(file)
                                  loadRightFiles(file.id)
                                } else {
                                  setSelectedFile(file)
                                }
                                return 
                              }
                              setDragSelecting(true)
                              setSelectedFiles(prev => {
                                const next = new Set(prev)
                                if (next.has(file.id)) next.delete(file.id)
                                else next.add(file.id)
                                return next
                              })
                            }}
                            onMouseEnter={() => {
                              if (dragSelecting) setSelectedFiles(prev => new Set([...prev, file.id]))
                            }}
                            onContextMenu={e => {
                              e.preventDefault()
                              setContextMenu({ visible: true, x: e.clientX, y: e.clientY, file })
                            }}
                            style={{
                              background: isSelected ? 'var(--accent-light)' : (isPreviewActive ? 'var(--bg-tertiary)' : 'var(--bg-card)'),
                              border: `1px solid ${isSelected ? 'var(--accent)' : (isPreviewActive ? 'var(--blue-400)' : 'var(--border)')}`,
                              borderRadius: 12, padding: '10px 14px', textDecoration: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 14,
                              color: 'inherit',
                            }}
                            whileHover={{ x: 4, borderColor: isSelected ? 'var(--accent)' : 'var(--blue-200)', background: isSelected ? 'var(--accent-light)' : 'var(--bg-tertiary)' }}
                          >
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                              {isSelected && (
                                <div style={{ position: 'absolute', inset: -2, zIndex: 10, color: 'var(--accent)', background: 'var(--bg-card)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <CheckSquare size={18} />
                                </div>
                              )}
                              {cat === 'image' && file.thumbnailLink ? (
                                <img src={file.thumbnailLink} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} draggable="false" />
                              ) : <Icon size={18} style={{ color: 'var(--text-secondary)' }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                {getFileBadge(file.name) && (
                                  <div style={{ 
                                    background: `${getFileBadge(file.name).color}20`,
                                    color: getFileBadge(file.name).color, padding: '2px 6px', borderRadius: 4,
                                    fontSize: 9, fontWeight: 800, flexShrink: 0
                                  }}>
                                    {getFileBadge(file.name).label}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatBytes(file.size)} · {new Date(file.createdTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                            </div>
                            <ExternalLink size={16} style={{ color: 'var(--text-muted)' }} />
                          </motion.div>
                        )
                      })}
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
              <FolderOpen size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>Pilih Folder</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Klik salah satu folder di sidebar kiri untuk melihat isinya</div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Preview Panel */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              className="card"
              initial={{ opacity: 0, width: 0, marginLeft: -20 }}
              animate={{ opacity: 1, width: 340, marginLeft: 0 }}
              exit={{ opacity: 0, width: 0, marginLeft: -20 }}
              style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Preview File</h3>
                <button onClick={() => setSelectedFile(null)} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                  <X size={18} />
                </button>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Preview Box */}
                <div style={{
                  width: '100%', height: 240, background: 'var(--bg-secondary)', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  border: '1px solid var(--border)'
                }}>
                  {getFileCategory(selectedFile.mimeType, selectedFile.name) === 'image' && selectedFile.thumbnailLink ? (
                    <img src={selectedFile.thumbnailLink.replace('=s220', '=s1000')} alt={selectedFile.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : selectedFile.webViewLink ? (
                    <iframe 
                      src={selectedFile.webViewLink.replace(/\/view.*/, '/preview')} 
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="File Preview"
                      allow="autoplay"
                    />
                  ) : (
                    <File size={64} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                {/* File Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Nama File</div>
                    <div style={{ fontSize: 14, fontWeight: 600, wordBreak: 'break-all' }}>{selectedFile.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Ukuran</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{formatBytes(selectedFile.size)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Diupload</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(selectedFile.createdTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a href={selectedFile.webViewLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                    <ExternalLink size={16} /> Buka Layar Penuh
                  </a>
                  <button 
                    onClick={() => handleDeleteFile(selectedFile)}
                    className="btn"
                    disabled={deleting}
                    style={{ width: '100%', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  >
                    {deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />} 
                    {deleting ? 'Menghapus...' : 'Hapus File'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(37, 99, 235, 0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}
          >
            <Upload size={80} style={{ marginBottom: 20 }} />
            <h2 style={{ fontSize: 32, fontWeight: 800 }}>Lepaskan untuk Mengupload</h2>
            <p style={{ fontSize: 18, opacity: 0.8 }}>File akan dikelompokkan ke dalam folder klien baru</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadModal.isOpen && (
          <motion.div
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              style={{ background: 'var(--bg-card)', padding: 30, borderRadius: 16, width: 400, maxWidth: '90%', boxShadow: 'var(--shadow-xl)' }}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FolderOpen size={20} color="var(--accent)" />
                Buat Orderan Baru
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                {uploadModal.files?.length} file akan diupload. Masukkan nama klien untuk mengelompokkan file.
              </p>
              
              <input 
                autoFocus
                className="form-input" 
                placeholder="Misal: Brin, Kemenkeu, Budi..." 
                value={uploadClientName}
                onChange={e => setUploadClientName(e.target.value)}
                style={{ width: '100%', marginBottom: 20 }}
              />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => { setUploadModal({ isOpen: false, files: null }); setUploadClientName('') }}
                  disabled={uploadingFile}
                >
                  Batal
                </button>
                <button 
                  className="btn btn-primary" 
                  disabled={!uploadClientName.trim() || uploadingFile}
                  onClick={async () => {
                    setUploadingFile(true)
                    try {
                      const { createOrderFolder } = await import('../lib/drive')
                      // This creates ClientName -> DateFolder
                      const { id: folderId, customerFolderId } = await createOrderFolder(uploadClientName, null)
                      
                      let newFiles = []
                      for (let i = 0; i < uploadModal.files.length; i++) {
                        const file = uploadModal.files[i]
                        setUploadProgress({ name: file.name, current: i + 1, total: uploadModal.files.length, percent: 0 })
                        const uploaded = await uploadFileToDrive(file, folderId, (percent) => {
                          setUploadProgress(prev => prev ? { ...prev, percent } : null)
                        })
                        newFiles.push(uploaded)
                      }
                      
                      toast.success(`${uploadModal.files.length} file berhasil diupload ke ${uploadClientName}`)
                      setUploadModal({ isOpen: false, files: null })
                      setUploadClientName('')
                      
                      // Refresh folders list
                      const newFolders = await getAllOrderFolders()
                      setFolders(newFolders)
                      
                    } catch (err) {
                      toast.error('Gagal upload: ' + err.message)
                      console.error(err)
                    } finally {
                      setUploadingFile(false)
                      setUploadProgress(null)
                    }
                  }}
                >
                  {uploadingFile ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                  Upload Sekarang
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu.visible && contextMenu.file && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-lg)',
              zIndex: 1000,
              padding: 4,
              minWidth: 160,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
            onClick={e => e.stopPropagation()}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation() }}
          >
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ justifyContent: 'flex-start', padding: '6px 12px', fontSize: 13 }}
              onClick={() => {
                setSelectedFiles(prev => {
                  const next = new Set(prev)
                  if (next.has(contextMenu.file.id)) next.delete(contextMenu.file.id)
                  else next.add(contextMenu.file.id)
                  return next
                })
                setContextMenu({ visible: false, x: 0, y: 0, file: null })
              }}
            >
              <CheckSquare size={14} style={{ marginRight: 8, color: 'var(--text-muted)' }} /> 
              {selectedFiles.has(contextMenu.file.id) ? 'Batal Pilih' : 'Pilih File'}
            </button>
            
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ justifyContent: 'flex-start', padding: '6px 12px', fontSize: 13 }}
              onClick={() => {
                setSelectedFile(contextMenu.file)
                setContextMenu({ visible: false, x: 0, y: 0, file: null })
              }}
            >
              <Eye size={14} style={{ marginRight: 8, color: 'var(--text-muted)' }} /> Lihat / Preview
            </button>

            {contextMenu.file.webViewLink && (
              <a 
                href={contextMenu.file.webViewLink} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-ghost btn-sm" 
                style={{ justifyContent: 'flex-start', padding: '6px 12px', fontSize: 13 }}
                onClick={() => setContextMenu({ visible: false, x: 0, y: 0, file: null })}
              >
                <ExternalLink size={14} style={{ marginRight: 8, color: 'var(--text-muted)' }} /> Buka di Drive
              </a>
            )}

            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

            {selectedFiles.size > 1 && selectedFiles.has(contextMenu.file.id) ? (
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ justifyContent: 'flex-start', padding: '6px 12px', fontSize: 13, color: 'var(--danger)' }}
                onClick={() => {
                  handleBatchDeleteClick()
                  setContextMenu({ visible: false, x: 0, y: 0, file: null })
                }}
              >
                <Trash2 size={14} style={{ marginRight: 8 }} /> Hapus {selectedFiles.size} Terpilih
              </button>
            ) : (
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ justifyContent: 'flex-start', padding: '6px 12px', fontSize: 13, color: 'var(--danger)' }}
                onClick={() => {
                  handleDeleteFile(contextMenu.file)
                  setContextMenu({ visible: false, x: 0, y: 0, file: null })
                }}
              >
                <Trash2 size={14} style={{ marginRight: 8 }} /> Hapus File
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => !deleting && setConfirmModal({ isOpen: false, type: null, target: null })}
        onConfirm={confirmDelete}
        title={confirmModal.type === 'folder' ? 'Hapus Folder Permanen?' : confirmModal.type === 'batch' ? 'Hapus File Terpilih?' : 'Hapus File Permanen?'}
        message={
          confirmModal.type === 'folder' 
            ? `Yakin ingin menghapus folder "${confirmModal.target?.name}" beserta SEMUA isinya? Tindakan ini tidak bisa dibatalkan.` 
            : confirmModal.type === 'batch'
            ? `Yakin ingin menghapus ${selectedFiles.size} file yang dipilih secara permanen? Tindakan ini tidak bisa dibatalkan.`
            : `Yakin ingin menghapus file "${confirmModal.target?.name}"? Tindakan ini tidak bisa dibatalkan.`
        }
        isLoading={deleting}
      />
    </motion.div>
  )
}
