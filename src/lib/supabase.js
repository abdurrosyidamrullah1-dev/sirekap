import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ccderytqghikbswfutfp.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6mtPuN4Gd61FEP9yx_AVEw_591xGQ1L'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Status Config ─────────────────────────────────────────────────────────────
export const ORDER_STATUSES = [
  { value: 'pending',     label: 'Pending',      desc: 'Orderan baru masuk',          color: '#f59e0b' },
  { value: 'in_progress', label: 'Dikerjakan',   desc: 'Sedang dalam pengerjaan',     color: '#3b82f6' },
  { value: 'review',      label: 'Review',       desc: 'Menunggu review pelanggan',   color: '#8b5cf6' },
  { value: 'revision',    label: 'Revisi',       desc: 'Perlu perbaikan/revisi',      color: '#f97316' },
  { value: 'approved',    label: 'Approved',     desc: 'Disetujui pelanggan',         color: '#10b981' },
  { value: 'done',        label: 'Selesai',      desc: 'Selesai & sudah diserahkan',  color: '#06b6d4' },
  { value: 'cancelled',   label: 'Dibatalkan',   desc: 'Dibatalkan',                  color: '#ef4444' },
]

export const getStatusConfig = (status) =>
  ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0]

// ─── Orders ───────────────────────────────────────────────────────────────────
export const getOrders = async (filters = {}) => {
  let query = supabase
    .from('orders')
    .select(`*, order_items(*), order_files(*)`)
    .order('created_at', { ascending: false })

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.search) query = query.ilike('customer_name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getOrderById = async (id) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items(*), order_files(*), order_timeline(*)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createOrder = async (orderData, items) => {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single()
  if (orderErr) throw orderErr

  // Insert items
  if (items?.length > 0) {
    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(items.map(item => ({ ...item, order_id: order.id })))
    if (itemsErr) throw itemsErr
  }

  // Log initial status
  await addTimeline(order.id, order.status, 'Orderan dibuat')

  return order
}

export const updateOrder = async (id, updates) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateOrderStatus = async (id, newStatus, note = '') => {
  const data = await updateOrder(id, { status: newStatus })
  await addTimeline(id, newStatus, note)
  return data
}

export const deleteOrder = async (id) => {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) throw error
}

// ─── Order Items ───────────────────────────────────────────────────────────────
export const updateOrderItem = async (id, updates) => {
  const { data, error } = await supabase
    .from('order_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteOrderItem = async (id) => {
  const { error } = await supabase.from('order_items').delete().eq('id', id)
  if (error) throw error
}

export const addOrderItem = async (item) => {
  const { data, error } = await supabase.from('order_items').insert([item]).select().single()
  if (error) throw error
  return data
}

// ─── Order Files ───────────────────────────────────────────────────────────────
export const addOrderFile = async (fileData) => {
  const { data, error } = await supabase.from('order_files').insert([fileData]).select().single()
  if (error) throw error
  return data
}

export const deleteOrderFile = async (id) => {
  const { error } = await supabase.from('order_files').delete().eq('id', id)
  if (error) throw error
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
export const addTimeline = async (orderId, status, note = '') => {
  const { error } = await supabase
    .from('order_timeline')
    .insert([{ order_id: orderId, status, note }])
  if (error) console.error('Timeline error:', error)
}

export const getTimeline = async (orderId) => {
  const { data, error } = await supabase
    .from('order_timeline')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// ─── Reports / Stats ──────────────────────────────────────────────────────────
export const getOrderStats = async () => {
  const { data, error } = await supabase.from('orders').select('status, created_at')
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

  return { stats, chartData: last7 }
}
