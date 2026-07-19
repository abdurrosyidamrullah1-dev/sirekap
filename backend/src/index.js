import 'dotenv/config'
import express from 'express'
import { corsMiddleware } from './middleware/cors.js'
import ordersRouter from './routes/orders.js'
import orderItemsRouter from './routes/orderItems.js'
import orderFilesRouter from './routes/orderFiles.js'
import timelineRouter from './routes/timeline.js'
import reportsRouter from './routes/reports.js'

const app = express()
const PORT = process.env.PORT || 3001

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(corsMiddleware)
app.use(express.json())

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/orders',       ordersRouter)
app.use('/api/order-items',  orderItemsRouter)
app.use('/api/order-files',  orderFilesRouter)
app.use('/api/timeline',     timelineRouter)
app.use('/api/reports',      reportsRouter)

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} tidak ditemukan` })
})

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('❌ Server error:', err)
  res.status(500).json({ message: err.message || 'Internal server error' })
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Si Rekap Backend running on http://localhost:${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/api/health`)
})
