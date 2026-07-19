// Notifications: cek deadline orderan dan tampilkan reminder
import { getOrders } from './supabase'

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

export const showNotification = (title, body, icon = '/logo.png') => {
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon, badge: '/logo.png' })
}

export const checkDeadlineNotifications = async () => {
  try {
    const orders = await getOrders({ role: 'designer' })
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const activeOrders = orders.filter(o => o.status !== 'done' && o.status !== 'cancelled' && o.deadline)

    let overdueCount = 0
    let todayCount = 0
    let tomorrowCount = 0

    activeOrders.forEach(order => {
      const deadline = new Date(order.deadline)
      const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())
      if (deadlineDay < today) overdueCount++
      else if (deadlineDay.getTime() === today.getTime()) todayCount++
      else if (deadlineDay.getTime() === tomorrow.getTime()) tomorrowCount++
    })

    if (overdueCount > 0) showNotification('⚠️ Deadline Terlewat!', `Ada ${overdueCount} orderan yang sudah melewati deadline!`)
    else if (todayCount > 0) showNotification('🔥 Deadline Hari Ini!', `Ada ${todayCount} orderan yang harus selesai hari ini!`)
    else if (tomorrowCount > 0) showNotification('⏰ Reminder Deadline', `Ada ${tomorrowCount} orderan yang deadline-nya besok!`)

    return { overdueCount, todayCount, tomorrowCount, total: overdueCount + todayCount + tomorrowCount }
  } catch (e) {
    console.error('Deadline check failed:', e)
    return { overdueCount: 0, todayCount: 0, tomorrowCount: 0, total: 0 }
  }
}

export const getDeadlineAlertOrders = (orders) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  return orders.filter(o => {
    if (o.status === 'done' || o.status === 'cancelled' || !o.deadline) return false
    const deadline = new Date(o.deadline)
    const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())
    return deadlineDay <= tomorrow
  }).length
}
