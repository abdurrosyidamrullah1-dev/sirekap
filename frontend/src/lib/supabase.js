// ─── API Base URL ─────────────────────────────────────────────────────────────
// Di development: Vite proxy /api → localhost:3001
// Di production: set VITE_API_URL ke URL backend yang di-deploy
const API_URL = import.meta.env.VITE_API_URL || ''

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(err.message || `API error ${res.status}`)
  }
  // 204 No Content
  if (res.status === 204) return null
  return res.json()
}

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
  const params = new URLSearchParams()
  if (filters.status && filters.status !== 'all') params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.role) params.set('role', filters.role)
  const qs = params.toString()
  return apiFetch(`/orders${qs ? `?${qs}` : ''}`)
}

export const getOrderById = async (id) => apiFetch(`/orders/${id}`)

export const createOrder = async (orderData, items) =>
  apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify({ orderData, items }),
  })

export const updateOrder = async (id, updates) =>
  apiFetch(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })

export const updateOrderStatus = async (id, newStatus, note = '') =>
  apiFetch(`/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus, note }),
  })

export const deleteOrder = async (id) =>
  apiFetch(`/orders/${id}`, { method: 'DELETE' })

// ─── Order Items ───────────────────────────────────────────────────────────────
export const updateOrderItem = async (id, updates) =>
  apiFetch(`/order-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })

export const deleteOrderItem = async (id) =>
  apiFetch(`/order-items/${id}`, { method: 'DELETE' })

export const addOrderItem = async (item) =>
  apiFetch('/order-items', {
    method: 'POST',
    body: JSON.stringify(item),
  })

// ─── Order Files ───────────────────────────────────────────────────────────────
export const addOrderFile = async (fileData) =>
  apiFetch('/order-files', {
    method: 'POST',
    body: JSON.stringify(fileData),
  })

export const deleteOrderFile = async (id) =>
  apiFetch(`/order-files/${id}`, { method: 'DELETE' })

// ─── Timeline ─────────────────────────────────────────────────────────────────
export const addTimeline = async (orderId, status, note = '') =>
  apiFetch('/timeline', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, status, note }),
  })

export const getTimeline = async (orderId) =>
  apiFetch(`/timeline/${orderId}`)

// ─── Reports / Stats ──────────────────────────────────────────────────────────
export const getOrderStats = async (role = null) => {
  const params = role ? `?role=${role}` : ''
  return apiFetch(`/reports/stats${params}`)
}
