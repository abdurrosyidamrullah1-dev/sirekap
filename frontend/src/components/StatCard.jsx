import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function StatCard({ label, value, icon: Icon, color = 'blue', delay = 0 }) {
  const [display, setDisplay] = useState(0)

  // Animated counter
  useEffect(() => {
    if (typeof value !== 'number') return
    let start = 0
    const duration = 700
    const step = 16
    const increment = value / (duration / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.floor(start))
      }
    }, step)
    return () => clearInterval(timer)
  }, [value])

  return (
    <motion.div
      className={`stat-card ${color}`}
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}
    >
      <div className={`stat-icon ${color}`}>
        <Icon size={20} />
      </div>
      <div className="stat-value">{typeof value === 'number' ? display : value}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  )
}
