import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/timeline/:orderId
router.get('/:orderId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('order_timeline')
      .select('*')
      .eq('order_id', req.params.orderId)
      .order('created_at', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/timeline
router.post('/', async (req, res) => {
  try {
    const { order_id, status, note } = req.body
    const { error } = await supabase
      .from('order_timeline')
      .insert([{ order_id, status, note: note || '' }])
    if (error) throw error
    res.status(201).json({ success: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
