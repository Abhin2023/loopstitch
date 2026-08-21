import { createContext, useContext, useState, useEffect } from 'react'
import client from '../api/client'

const AdminAuthContext = createContext(null)
const TOKEN_KEY = 'loopstitch_admin_token'

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    client
      .get('/api/admin/me')
      .then((res) => setAdmin(res.data))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const login = async (username, password) => {
    const res = await client.post('/api/admin/login', { username, password })
    localStorage.setItem(TOKEN_KEY, res.data.access_token)
    setToken(res.data.access_token)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setAdmin(null)
  }

  return (
    <AdminAuthContext.Provider value={{ token, admin, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)
