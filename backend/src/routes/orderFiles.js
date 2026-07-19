import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// POST /api/order-files
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('order_files')
      .insert([req.body])
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/order-files/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('order_files').delete().eq('id', req.params.id)
    if (error) throw error
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
