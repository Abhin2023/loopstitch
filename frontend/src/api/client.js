import axios from 'axios'

// In dev, Vite proxies nothing by default, so point straight at the API.
// In production, set VITE_API_URL to your deployed backend, e.g. https://api.loopstitch.online
export const API_BASE = import.meta.env.VITE_API_URL || ''

const client = axios.create({
  baseURL: API_BASE,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('loopstitch_admin_token')
  if (token && config.url?.includes('/admin')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('loopstitch_admin_token')
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(err)
  }
)

export const mediaUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_BASE}${path}`
}

export default client
