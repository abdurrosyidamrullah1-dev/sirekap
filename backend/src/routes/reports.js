import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/reports/stats?role=designer
router.get('/stats', async (req, res) => {
  try {
    const { role } = req.query
    let query = supabase.from('orders').select('status, created_at')
    if (role) query = query.eq('order_role', role)

    const { data, error } = await query
    if (error) throw error

    const stats = {
      total:       data.length,
      pending:     data.filter(o => o.status === 'pending').length,
      in_progress: data.filter(o => o.status === 'in_progress').length,
      review:      data.filter(o => o.status === 'review').length,
      revision:    data.filter(o => o.status === 'revision').length,
      approved:    data.filter(o => o.status === 'approved').length,
      done:        data.filter(o => o.status === 'done').length,
    }

    const last7 = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const ds = date.toISOString().split('T')[0]
      last7.push({
        date: ds,
        count: data.filter(o => o.created_at.startsWith(ds)).length,
      })
    }

    res.json({ stats, chartData: last7 })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
