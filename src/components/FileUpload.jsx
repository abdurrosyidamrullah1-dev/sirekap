import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileText, Image, File, CheckCircle, Loader2 } from 'lucide-react'
import { uploadFileToDrive, createOrderFolder, isGoogleSignedIn } from '../lib/drive'
import { addOrderFile, updateOrder } from '../lib/supabase'
import toast from 'react-hot-toast'

const getFileIcon = (name) => {
  const ext = name.split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return Image
  if (['pdf','doc','docx'].includes(ext)) return FileText
  return File
}

export default function FileUpload({ order, onFileAdded }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState([])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    await processFiles(files)
  }, [order])

  const handleInput = async (e) => {
    const files = Array.from(e.target.files)
    await processFiles(files)
    e.target.value = ''
  }

  const processFiles = async (files) => {
    if (!isGoogleSignedIn()) {
      toast.error('Hubungkan Google Drive dulu di sidebar!')
      return
    }

    for (const file of files) {
      setUploading(prev => [...prev, file.name])
      try {
        // Get or create folder
        let folderId = order.drive_folder_id
        let folderUrl = order.drive_folder_url

        if (!folderId) {
          const folder = await createOrderFolder(order.customer_name, order.id)
          folderId = folder.id
          folderUrl = folder.url
          await updateOrder(order.id, { drive_folder_id: folderId, drive_folder_url: folderUrl })
        }

        // Upload
        const result = await uploadFileToDrive(file, folderId)

        // Save to Supabase
        const fileRecord = await addOrderFile({
          order_id: order.id,
          file_name: file.name,
          drive_file_id: result.id,
          drive_file_url: result.webViewLink,
        })

        onFileAdded(fileRecord)
        toast.success(`${file.name} berhasil diupload!`)
      } catch (err) {
        toast.error(`Gagal upload ${file.name}`)
        console.error(err)
      } finally {
        setUploading(prev => prev.filter(n => n !== file.name))
      }
    }
  }

  return (
    <div>
      <motion.label
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        style={{ display: 'block', cursor: 'pointer' }}
      >
        <input
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleInput}
        />
        <motion.div
          className="upload-zone-icon"
          animate={dragOver ? { scale: 1.15, rotate: 10 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <Upload size={24} />
        </motion.div>
        <h4>Drop file desain di sini</h4>
        <p>atau klik untuk pilih file</p>
        <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          Mendukung semua format file (.tif, .psd, .png, .pdf, dll)
        </p>
      </motion.label>

      {/* Uploading Progress */}
      <AnimatePresence>
        {uploading.map((name) => (
          <motion.div
            key={name}
            className="file-item"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: 8, borderColor: 'var(--blue-200)' }}
          >
            <div className="file-icon">
              <Loader2 size={18} className="spinning" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
            <div className="file-name">{name}</div>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Mengupload...</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
