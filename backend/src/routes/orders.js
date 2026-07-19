import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ─── Helper: add timeline entry ───────────────────────────────────────────────
const addTimeline = async (orderId, status, note = '') => {
  const { error } = await supabase
    .from('order_timeline')
    .insert([{ order_id: orderId, status, note }])
  if (error) console.error('Timeline error:', error)
}

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const { status, search, role } = req.query
    let query = supabase
      .from('orders')
      .select('*, order_items(*), order_files(*)')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') query = query.eq('status', status)
    if (search) query = query.ilike('customer_name', `%${search}%`)
    if (role) query = query.eq('order_role', role)

    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), order_files(*), order_timeline(*)')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(404).json({ message: err.message })
  }
})

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const { orderData, items } = req.body

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single()
    if (orderErr) throw orderErr

    if (items?.length > 0) {
      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(items.map(item => ({ ...item, order_id: order.id })))
      if (itemsErr) throw itemsErr
    }

    await addTimeline(order.id, order.status, 'Orderan dibuat')
    res.status(201).json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/orders/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    await addTimeline(req.params.id, status, note || '')
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('orders').delete().eq('id', req.params.id)
    if (error) throw error
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
