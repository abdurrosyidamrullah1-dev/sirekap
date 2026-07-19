import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// GET /api/order-items/:id (jarang dipakai langsung, tapi tersedia)
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(404).json({ message: err.message })
  }
})

// POST /api/order-items
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .insert([req.body])
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/order-items/:id
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/order-items/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('order_items').delete().eq('id', req.params.id)
    if (error) throw error
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
