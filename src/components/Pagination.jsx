import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ total, perPage, page, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  const pages = []
  const maxVisible = 5
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  const btnStyle = (active) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 8, fontWeight: 600, fontSize: 13,
    cursor: active ? 'default' : 'pointer', border: 'none',
    background: active ? 'linear-gradient(135deg, var(--blue-600), var(--blue-700))' : 'var(--bg-secondary)',
    color: active ? '#fff' : 'var(--text-secondary)',
    boxShadow: active ? 'var(--shadow-blue)' : 'none',
    border: active ? 'none' : '1px solid var(--border)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Menampilkan {Math.min((page-1)*perPage+1, total)}–{Math.min(page*perPage, total)} dari <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> orderan
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <motion.button
          onClick={() => onChange(page - 1)} disabled={page <= 1}
          style={{ ...btnStyle(false), opacity: page <= 1 ? 0.4 : 1 }}
          whileHover={page > 1 ? { y: -1 } : {}} whileTap={page > 1 ? { scale: 0.93 } : {}}
        ><ChevronLeft size={15} /></motion.button>

        {start > 1 && (<><motion.button onClick={() => onChange(1)} style={btnStyle(false)} whileHover={{ y: -1 }} whileTap={{ scale: 0.93 }}>1</motion.button>{start > 2 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}</>)}

        {pages.map(p => (
          <motion.button key={p} onClick={() => onChange(p)} style={btnStyle(p === page)}
            whileHover={p !== page ? { y: -1 } : {}} whileTap={p !== page ? { scale: 0.93 } : {}}>
            {p}
          </motion.button>
        ))}

        {end < totalPages && (<>{end < totalPages - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}<motion.button onClick={() => onChange(totalPages)} style={btnStyle(false)} whileHover={{ y: -1 }} whileTap={{ scale: 0.93 }}>{totalPages}</motion.button></>)}

        <motion.button
          onClick={() => onChange(page + 1)} disabled={page >= totalPages}
          style={{ ...btnStyle(false), opacity: page >= totalPages ? 0.4 : 1 }}
          whileHover={page < totalPages ? { y: -1 } : {}} whileTap={page < totalPages ? { scale: 0.93 } : {}}
        ><ChevronRight size={15} /></motion.button>
      </div>
    </div>
  )
}
