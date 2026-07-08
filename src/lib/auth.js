// ─── Auth helpers (localStorage, no backend) ─────────────────────────────────

export const getRole = () => localStorage.getItem('sirekap_role') || null
export const isLoggedIn = () => !!localStorage.getItem('sirekap_logged_in')
export const isAdmin = () => getRole() === 'admin'
export const isDesigner = () => getRole() === 'designer'

export const logout = () => {
  localStorage.removeItem('sirekap_role')
  localStorage.removeItem('sirekap_logged_in')
}
